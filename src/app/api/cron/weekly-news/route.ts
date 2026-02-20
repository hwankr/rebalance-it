import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyCronSecret, getUserSubscriptionPlan } from "@/lib/notification/scheduler";
import { canSendWeeklyNews } from "@/lib/notification/plan-gate";
import { fetchAllNews, type StockNewsItem } from "@/lib/stock-news";
import { summarizeStockNews } from "@/lib/notification/news-summarizer";
import { weeklyNewsTemplate } from "@/lib/notification/templates/weekly-news";
import { sendEmail } from "@/lib/notification/email-sender";

export const maxDuration = 300;

function getWeekLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const weekNum = Math.ceil(now.getDate() / 7);
  return `${year}년 ${month}월 ${weekNum}주차`;
}

export async function GET(request: Request) {
  // 1. CRON_SECRET 검증
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminSupabaseClient() as any;
  const now = new Date();
  let processedCount = 0;
  let skippedCount = 0;

  // 2. 주간 뉴스 활성화된 사용자 조회
  const { data: preferences, error: prefError } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("notification_enabled", true)
    .eq("email_enabled", true)
    .eq("weekly_news_enabled", true);

  if (prefError) {
    console.error("[weekly-news] notification_preferences 조회 실패:", prefError);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  if (!preferences || preferences.length === 0) {
    return NextResponse.json({ message: "No users with weekly news enabled", processed: 0 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rebalance-it.app";
  const weekLabel = getWeekLabel();

  for (const pref of preferences) {
    const userId: string = pref.user_id;

    // 3. 구독 플랜 체크 (Plus 이상만)
    const plan = await getUserSubscriptionPlan(supabase, userId);
    if (!canSendWeeklyNews(plan)) {
      skippedCount++;
      continue;
    }

    // 4. 이메일 주소 결정
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const emailAddress = pref.email_address ?? userData?.user?.email;
    if (!emailAddress) {
      skippedCount++;
      continue;
    }

    // 5. 뉴스 활성화된 종목 조회
    const { data: portfolios } = await supabase
      .from("manual_portfolios")
      .select("id")
      .eq("user_id", userId);

    if (!portfolios || portfolios.length === 0) {
      skippedCount++;
      continue;
    }

    const portfolioIds = portfolios.map((p: { id: string }) => p.id);
    const { data: newsStocks } = await supabase
      .from("manual_stocks")
      .select("stock_code, stock_name, currency")
      .in("portfolio_id", portfolioIds)
      .eq("news_enabled", true);

    if (!newsStocks || newsStocks.length === 0) {
      skippedCount++;
      continue;
    }

    // 중복 종목 제거 (여러 포트폴리오에 동일 종목이 있을 수 있음)
    const uniqueStocks = Array.from(
      new Map(
        newsStocks.map((s: { stock_code: string; stock_name: string; currency: string }) => [s.stock_code, s]),
      ).values(),
    ) as Array<{ stock_code: string; stock_name: string; currency: string }>;

    // 6. 종목별 뉴스 수집 (병렬)
    const newsMap = new Map<string, StockNewsItem[]>();
    const fetchResults = await Promise.allSettled(
      uniqueStocks.map(async (stock) => {
        const isKorean = /^\d{6}$/.test(stock.stock_code);
        const news = await fetchAllNews(stock.stock_code, stock.stock_name, { isKorean });
        return { stockCode: stock.stock_code, news };
      }),
    );
    for (const result of fetchResults) {
      if (result.status === "fulfilled" && result.value.news.length > 0) {
        newsMap.set(result.value.stockCode, result.value.news);
      } else if (result.status === "rejected") {
        console.error(`[weekly-news] 뉴스 수집 실패:`, result.reason);
      }
    }

    if (newsMap.size === 0) {
      skippedCount++;
      continue;
    }

    // 7. AI 요약 생성
    const summaries = await summarizeStockNews(uniqueStocks, newsMap);
    if (summaries.length === 0) {
      skippedCount++;
      continue;
    }

    // 8. notification_log 삽입
    const userName = emailAddress.split("@")[0];
    const { data: logEntry, error: logError } = await supabase
      .from("notification_log")
      .insert({
        user_id: userId,
        notification_type: "weekly_news",
        title: `📰 ${weekLabel} 종목 뉴스 브리핑`,
        status: "pending",
        metadata: {
          week_label: weekLabel,
          stock_count: uniqueStocks.length,
          news_stock_count: newsMap.size,
          plan,
        },
      })
      .select("id")
      .single();

    if (logError) {
      console.error(`[weekly-news] notification_log 삽입 실패 (user: ${userId}):`, logError);
      continue;
    }

    // 9. 이메일 생성 + 발송
    const unsubscribeUrl = `${appUrl}/api/notification/unsubscribe?token=${pref.unsubscribe_token}`;
    const { subject, html } = weeklyNewsTemplate(
      {
        userName,
        weekLabel,
        summaries,
        totalStocks: uniqueStocks.length,
      },
      unsubscribeUrl,
    );

    const result = await sendEmail({
      to: emailAddress,
      subject,
      html,
      unsubscribeToken: pref.unsubscribe_token,
    });

    // 10. 로그 상태 업데이트
    if (result.success) {
      await supabase
        .from("notification_log")
        .update({ status: "sent", sent_at: now.toISOString() })
        .eq("id", logEntry.id);

      processedCount++;
    } else {
      await supabase
        .from("notification_log")
        .update({
          status: "failed",
          error_message: result.error,
        })
        .eq("id", logEntry.id);
      console.error(`[weekly-news] 이메일 발송 실패 (user: ${userId}):`, result.error);
    }
  }

  return NextResponse.json({
    message: "Weekly news completed",
    processed: processedCount,
    skipped: skippedCount,
    sentAt: now.toISOString(),
  });
}
