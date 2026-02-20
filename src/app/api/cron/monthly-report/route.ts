import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyCronSecret, getUserSubscriptionPlan } from "@/lib/notification/scheduler";
import { canSendMonthlyReport } from "@/lib/notification/plan-gate";
import { collectMonthlyReportData } from "@/lib/notification/monthly-report";
import { monthlyReportTemplate } from "@/lib/notification/templates/monthly-report";
import { sendEmail } from "@/lib/notification/email-sender";
import { calculateNextReportAt } from "@/lib/notification/next-check";
import { parseReportSections } from "@/hooks/use-notification-preferences";

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

  // 2. 월간 리포트 활성화된 사용자 조회
  const { data: preferences, error: prefError } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("notification_enabled", true)
    .eq("email_enabled", true)
    .eq("monthly_report_enabled", true);

  if (prefError) {
    console.error("[monthly-report] notification_preferences 조회 실패:", prefError);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  if (!preferences || preferences.length === 0) {
    return NextResponse.json({ message: "No users with monthly report enabled", processed: 0 });
  }

  // report_next_send_at 기반 필터링
  const eligiblePrefs = (preferences ?? []).filter((pref: { report_next_send_at: string | null }) => {
    if (pref.report_next_send_at) {
      return new Date(pref.report_next_send_at) <= now;
    }
    // report_next_send_at이 NULL인 기존 사용자: 매월 1일에만 발송 (fallback)
    return now.getUTCDate() === 1;
  });

  if (eligiblePrefs.length === 0) {
    return NextResponse.json({ message: "No users due for report today", processed: 0 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rebalance-it.app";

  for (const pref of eligiblePrefs) {
    const userId: string = pref.user_id;
    const exchangeRate: number = pref.exchange_rate ?? 1300;

    // 3. 구독 플랜 체크 (Plus 이상만)
    const plan = await getUserSubscriptionPlan(supabase, userId);
    if (!canSendMonthlyReport(plan)) {
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

    // 5. 리포트 데이터 수집
    const reportData = await collectMonthlyReportData(supabase, userId, exchangeRate);
    if (!reportData) {
      skippedCount++;
      continue;
    }

    // 6. notification_log 삽입
    const { data: logEntry, error: logError } = await supabase
      .from("notification_log")
      .insert({
        user_id: userId,
        notification_type: "monthly_report",
        title: `📊 ${reportData.reportMonth} 포트폴리오 리포트`,
        status: "pending",
        metadata: {
          report_month: reportData.reportMonth,
          total_asset: reportData.totalAsset,
          portfolio_count: reportData.portfolios.length,
          plan,
        },
      })
      .select("id")
      .single();

    if (logError) {
      console.error(`[monthly-report] notification_log 삽입 실패 (user: ${userId}):`, logError);
      continue;
    }

    // 7. 이메일 생성 + 발송
    const unsubscribeUrl = `${appUrl}/api/notification/unsubscribe?token=${pref.unsubscribe_token}`;
    const sections = parseReportSections(pref.report_sections);
    const { subject, html } = monthlyReportTemplate(reportData, unsubscribeUrl, sections);

    const result = await sendEmail({
      to: emailAddress,
      subject,
      html,
      unsubscribeToken: pref.unsubscribe_token,
    });

    // 8. 로그 상태 업데이트
    if (result.success) {
      await supabase
        .from("notification_log")
        .update({ status: "sent", sent_at: now.toISOString() })
        .eq("id", logEntry.id);

      // report_last_sent_at, report_next_send_at 업데이트
      const nextSendAt = calculateNextReportAt({
        intervalType: pref.report_interval_type ?? "monthly",
        dayOfWeek: pref.report_day_of_week,
        dayOfMonth: pref.report_day_of_month,
        customDays: pref.report_custom_days,
        fromDate: now,
      });

      await supabase
        .from("notification_preferences")
        .update({
          report_last_sent_at: now.toISOString(),
          report_next_send_at: nextSendAt.toISOString(),
        })
        .eq("user_id", userId);

      processedCount++;
    } else {
      await supabase
        .from("notification_log")
        .update({
          status: "failed",
          error_message: result.error,
        })
        .eq("id", logEntry.id);
      console.error(`[monthly-report] 이메일 발송 실패 (user: ${userId}):`, result.error);
    }
  }

  return NextResponse.json({
    message: "Monthly report completed",
    processed: processedCount,
    skipped: skippedCount,
    sentAt: now.toISOString(),
  });
}
