import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/notification/email-sender";
import { emailLayout } from "@/lib/notification/templates/layout";
import { driftAlertTemplate } from "@/lib/notification/templates/drift-alert";
import { monthlyReportTemplate } from "@/lib/notification/templates/monthly-report";
import { weeklyNewsTemplate } from "@/lib/notification/templates/weekly-news";
import { collectMonthlyReportData, type MonthlyReportData } from "@/lib/notification/monthly-report";
import { calculateDrift, needsRebalancing, getMaxDrift } from "@/lib/rebalance/drift";
import type { PortfolioItem } from "@/lib/rebalance/types";

// 드리프트 알림 예시 데이터
function getSampleDriftAlert(userName: string) {
  return driftAlertTemplate(
    {
      userName,
      portfolios: [
        {
          name: "연금저축 ETF",
          maxDrift: 12.3,
          thresholdPct: 5,
          driftedStocks: [
            { name: "TIGER S&P500", currentPct: 42.3, targetPct: 30.0, driftPct: 12.3 },
            { name: "KODEX 200", currentPct: 13.7, targetPct: 20.0, driftPct: -6.3 },
            { name: "TIGER 미국나스닥100", currentPct: 25.1, targetPct: 20.0, driftPct: 5.1 },
          ],
        },
        {
          name: "ISA 글로벌",
          maxDrift: 8.7,
          thresholdPct: 5,
          driftedStocks: [
            { name: "VOO", currentPct: 48.7, targetPct: 40.0, driftPct: 8.7 },
            { name: "SCHD", currentPct: 14.5, targetPct: 20.0, driftPct: -5.5 },
          ],
        },
      ],
      isApproximate: false,
    },
    ""
  );
}

// 월간 리포트 예시 데이터
function getSampleMonthlyReport(userName: string) {
  const now = new Date();
  const reportMonth = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  const data: MonthlyReportData = {
    userName,
    reportMonth,
    totalAsset: 45_320_000,
    totalAssetChange: 1_850_000,
    totalAssetChangePct: 4.3,
    portfolios: [
      {
        name: "연금저축 ETF",
        totalValue: 28_500_000,
        stockCount: 5,
        maxDrift: 12.3,
        thresholdPct: 5,
        needsRebalancing: true,
        driftedStocks: [
          { name: "TIGER S&P500", currentPct: 42.3, targetPct: 30.0, driftPct: 12.3 },
          { name: "KODEX 200", currentPct: 13.7, targetPct: 20.0, driftPct: -6.3 },
          { name: "TIGER 미국나스닥100", currentPct: 25.1, targetPct: 20.0, driftPct: 5.1 },
        ],
      },
      {
        name: "ISA 글로벌",
        totalValue: 16_820_000,
        stockCount: 4,
        maxDrift: 3.2,
        thresholdPct: 5,
        needsRebalancing: false,
        driftedStocks: [],
      },
    ],
    rebalancingActivity: {
      executionCount: 3,
      completedSessions: 2,
      inProgressSessions: 1,
    },
  };

  return monthlyReportTemplate(data, "");
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // type 파라미터 파싱
    const validTypes = ["test", "drift", "monthly", "drift-real", "monthly-real", "weekly-news"];
    let testType = "test";
    try {
      const body = await request.json();
      if (body.type && validTypes.includes(body.type)) {
        testType = body.type;
      }
    } catch {
      // body가 없으면 기본 test
    }

    // Rate limit: max 3 test emails per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from("notification_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("notification_type", "test")
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "시간당 3회까지 테스트할 수 있습니다." },
        { status: 429 }
      );
    }

    // Get notification preferences
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pref } = await (supabase as any)
      .from("notification_preferences")
      .select("email_address, unsubscribe_token")
      .eq("user_id", user.id)
      .maybeSingle();

    const emailAddress = pref?.email_address ?? user.email;
    const unsubscribeToken = pref?.unsubscribe_token ?? "";

    if (!emailAddress) {
      return NextResponse.json(
        { error: "이메일 주소를 찾을 수 없습니다." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const userName = emailAddress.split("@")[0];

    // 타입별 이메일 콘텐츠 생성
    let subject: string;
    let html: string;
    let logTitle: string;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rebalance-it.app";
    const unsubscribeUrl = `${appUrl}/api/notification/unsubscribe?token=${unsubscribeToken}`;

    if (testType === "drift-real") {
      // 실제 유저 데이터 기반 드리프트 알림
      const { data: rebalanceSettings } = await db
        .from("rebalance_settings")
        .select("threshold_pct")
        .eq("user_id", user.id)
        .single();
      const thresholdPct: number = rebalanceSettings?.threshold_pct ?? 5;

      const { data: notifPref } = await db
        .from("notification_preferences")
        .select("exchange_rate")
        .eq("user_id", user.id)
        .maybeSingle();
      const exchangeRate: number = notifPref?.exchange_rate ?? 1300;

      const { data: portfolios } = await db
        .from("manual_portfolios")
        .select("id, name")
        .eq("user_id", user.id);

      if (!portfolios || portfolios.length === 0) {
        return NextResponse.json({ error: "포트폴리오가 없습니다." }, { status: 400 });
      }

      const driftedPortfolios: { name: string; maxDrift: number; thresholdPct: number; driftedStocks: { name: string; currentPct: number; targetPct: number; driftPct: number }[] }[] = [];
      let hasStalePrice = false;

      for (const portfolio of portfolios) {
        const { data: stocks } = await db
          .from("manual_stocks")
          .select("stock_code, stock_name, current_price, quantity, currency, price_updated_at, target_pct")
          .eq("portfolio_id", portfolio.id)
          .eq("is_rebalance_tracked", true);

        if (!stocks || stocks.length === 0) continue;

        const now = new Date();
        const items: PortfolioItem[] = stocks.map((s: { stock_code: string; stock_name: string; current_price: number; quantity: number; currency: string; price_updated_at: string | null; target_pct: number | null }) => {
          const priceInKrw = s.currency === "USD" ? s.current_price * exchangeRate : s.current_price;
          if (s.price_updated_at) {
            const diffHours = (now.getTime() - new Date(s.price_updated_at).getTime()) / (1000 * 60 * 60);
            if (diffHours > 48) hasStalePrice = true;
          } else {
            hasStalePrice = true;
          }
          return { stock_code: s.stock_code, stock_name: s.stock_name, current_price: priceInKrw, quantity: s.quantity, eval_amount: priceInKrw * s.quantity, current_pct: 0, target_pct: s.target_pct ?? 0, currency: s.currency };
        });

        const drifts = calculateDrift(items);
        const maxDrift = getMaxDrift(drifts);
        const drifted = drifts.filter((d) => Math.abs(d.drift_pct) > thresholdPct);

        // 실제 데이터 테스트에서는 임계치 이하도 포함 (상위 3개)
        const stocksToShow = drifted.length > 0
          ? drifted.map((d) => ({ name: d.stock_name, currentPct: d.current_pct, targetPct: d.target_pct, driftPct: d.drift_pct }))
          : drifts.slice(0, 3).map((d) => ({ name: d.stock_name, currentPct: d.current_pct, targetPct: d.target_pct, driftPct: d.drift_pct }));

        driftedPortfolios.push({ name: portfolio.name, maxDrift, thresholdPct, driftedStocks: stocksToShow });
      }

      if (driftedPortfolios.length === 0) {
        return NextResponse.json({ error: "리밸런싱 추적 중인 종목이 없습니다." }, { status: 400 });
      }

      const email = driftAlertTemplate({ userName, portfolios: driftedPortfolios, isApproximate: hasStalePrice }, unsubscribeUrl);
      subject = `[테스트] ${email.subject}`;
      html = email.html;
      logTitle = "🔔 테스트: 드리프트 알림 (실제 데이터)";
    } else if (testType === "monthly-real") {
      // 실제 유저 데이터 기반 월간 리포트
      const { data: notifPref } = await db
        .from("notification_preferences")
        .select("exchange_rate")
        .eq("user_id", user.id)
        .maybeSingle();
      const exchangeRate: number = notifPref?.exchange_rate ?? 1300;

      const reportData = await collectMonthlyReportData(db, user.id, exchangeRate);
      if (!reportData) {
        return NextResponse.json({ error: "포트폴리오 데이터가 없습니다." }, { status: 400 });
      }

      const email = monthlyReportTemplate(reportData, unsubscribeUrl);
      subject = `[테스트] ${email.subject}`;
      html = email.html;
      logTitle = "🔔 테스트: 월간 리포트 (실제 데이터)";
    } else if (testType === "weekly-news") {
      // 주간 뉴스 브리핑 예시 데이터
      const now = new Date();
      const month = now.getMonth() + 1;
      const weekNum = Math.ceil(now.getDate() / 7);
      const weekLabel = `${now.getFullYear()}년 ${month}월 ${weekNum}주차`;

      const email = weeklyNewsTemplate(
        {
          userName,
          weekLabel,
          summaries: [
            {
              stockName: "삼성전자",
              stockCode: "005930",
              summary: "삼성전자가 차세대 반도체 공정 투자를 확대한다고 발표했습니다. AI 반도체 수요 증가에 따라 HBM4 생산 라인 증설을 앞당기고 있으며, 2분기 실적 개선이 기대됩니다.",
              newsCount: 5,
            },
            {
              stockName: "Apple",
              stockCode: "AAPL",
              summary: "Apple이 새로운 AI 기능을 탑재한 제품 라인업을 공개할 예정입니다. 서비스 매출 성장세가 지속되며 월가 애널리스트들의 목표가 상향 조정이 이어지고 있습니다.",
              newsCount: 4,
            },
            {
              stockName: "TIGER S&P500",
              stockCode: "360750",
              summary: "S&P500 지수가 사상 최고치를 경신하며 TIGER S&P500 ETF 수익률도 상승세를 보이고 있습니다. 미국 경제 연착륙 기대감이 반영되고 있습니다.",
              newsCount: 3,
            },
          ],
          totalStocks: 3,
        },
        unsubscribeUrl,
      );
      subject = `[테스트] ${email.subject}`;
      html = email.html;
      logTitle = "🔔 테스트: 주간 종목 뉴스";
    } else if (testType === "drift") {
      const email = getSampleDriftAlert(userName);
      subject = `[테스트] ${email.subject}`;
      html = email.html;
      logTitle = "🔔 테스트: 드리프트 알림";
    } else if (testType === "monthly") {
      const email = getSampleMonthlyReport(userName);
      subject = `[테스트] ${email.subject}`;
      html = email.html;
      logTitle = "🔔 테스트: 월간 리포트";
    } else {
      subject = "🔔 Rebalance-it 테스트 알림";
      html = emailLayout(
        `<h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">테스트 알림</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">알림 설정이 정상적으로 작동합니다.</p>
        <p style="margin:0;font-size:14px;color:#6b7280;">이 이메일은 테스트 목적으로 발송되었습니다.</p>`,
        unsubscribeUrl
      );
      logTitle = "🔔 테스트 알림";
    }

    // Insert log with pending status
    const { data: log } = await db
      .from("notification_log")
      .insert({
        user_id: user.id,
        notification_type: "test",
        title: logTitle,
        status: "pending",
      })
      .select("id")
      .single();

    const result = await sendEmail({
      to: emailAddress,
      subject,
      html,
      unsubscribeToken,
    });

    // Update log status
    if (log?.id) {
      await db
        .from("notification_log")
        .update({ status: result.success ? "sent" : "failed" })
        .eq("id", log.id);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "이메일 전송에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, type: testType });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
