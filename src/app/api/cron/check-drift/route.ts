import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { calculateDrift, needsRebalancing, getMaxDrift } from "@/lib/rebalance/drift";
import type { PortfolioItem } from "@/lib/rebalance/types";
import { verifyCronSecret, getUserSubscriptionPlan, getMonthlyDriftAlertCount } from "@/lib/notification/scheduler";
import { canSendDriftAlert, canUseDriftDigest } from "@/lib/notification/plan-gate";
import { calculateNextCheckAt } from "@/lib/notification/next-check";
import { sendEmail } from "@/lib/notification/email-sender";
import { driftAlertTemplate } from "@/lib/notification/templates/drift-alert";
import { digestAlertTemplate } from "@/lib/notification/templates/digest-alert";

// 가격 데이터 만료 기준: 48시간
const PRICE_STALE_HOURS = 48;

interface PortfolioDriftInfo {
  name: string;
  maxDrift: number;
  thresholdPct: number;
  driftedStocks: {
    name: string;
    currentPct: number;
    targetPct: number;
    driftPct: number;
  }[];
}

export async function GET(request: Request) {
  // 1. CRON_SECRET 검증
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminSupabaseClient() as any;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rebalance-it.app";
  let processedCount = 0;
  let skippedCount = 0;

  // 2. 알림 활성화된 사용자 조회
  const { data: preferences, error: prefError } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("notification_enabled", true)
    .eq("email_enabled", true);

  if (prefError) {
    console.error("[check-drift] notification_preferences 조회 실패:", prefError);
    return NextResponse.json({ error: "DB query failed" }, { status: 500 });
  }

  if (!preferences || preferences.length === 0) {
    return NextResponse.json({ message: "No users with notifications enabled", processed: 0 });
  }

  const now = new Date();

  for (const pref of preferences) {
    const userId: string = pref.user_id;
    const cooldownDays: number = pref.cooldown_days ?? 7;
    const exchangeRate: number = pref.exchange_rate ?? 1300;

    // 3a. 쿨다운 체크: last_notified_at + cooldown_days > now → SKIP
    // digest 모드는 쿨다운을 발송 단계에서 처리하므로 여기서는 스킵하지 않음
    if (pref.alert_mode !== "digest" && pref.last_notified_at) {
      const lastNotified = new Date(pref.last_notified_at);
      const cooldownUntil = new Date(lastNotified);
      cooldownUntil.setDate(cooldownUntil.getDate() + cooldownDays);
      if (cooldownUntil > now) {
        skippedCount++;
        continue;
      }
    }

    // 3b. 리밸런싱 설정 조회 (threshold_pct)
    const { data: rebalanceSettings } = await supabase
      .from("rebalance_settings")
      .select("threshold_pct")
      .eq("user_id", userId)
      .single();

    // Change 1: Use alert_threshold_pct from notification_preferences if set
    const thresholdPct: number = pref.alert_threshold_pct ?? rebalanceSettings?.threshold_pct ?? 5;

    // Change 3: Handle alert_severity 'major_only'
    const severityMultiplier = pref.alert_severity === "major_only" ? 2 : 1;
    const effectiveThreshold = thresholdPct * severityMultiplier;

    // 3c. 포트폴리오 + 종목 조회
    const { data: portfolios } = await supabase
      .from("manual_portfolios")
      .select("id, name")
      .eq("user_id", userId);

    if (!portfolios || portfolios.length === 0) {
      skippedCount++;
      continue;
    }

    // Change 2: Filter excluded_portfolio_ids
    const excludedIds: string[] = pref.excluded_portfolio_ids ?? [];
    const filteredPortfolios = (portfolios ?? []).filter(
      (p: { id: string }) => !excludedIds.includes(p.id)
    );

    if (filteredPortfolios.length === 0) {
      skippedCount++;
      continue;
    }

    let userNeedsRebalancing = false;
    let hasStalePrice = false;
    const driftedPortfolios: PortfolioDriftInfo[] = [];

    for (const portfolio of filteredPortfolios) {
      // 리밸런싱 추적 종목만 조회
      const { data: stocks } = await supabase
        .from("manual_stocks")
        .select("stock_code, stock_name, current_price, quantity, currency, price_updated_at, target_pct")
        .eq("portfolio_id", portfolio.id)
        .eq("is_rebalance_tracked", true);

      if (!stocks || stocks.length === 0) continue;

      // 3d. PortfolioItem 배열 구성
      const portfolioItems: PortfolioItem[] = stocks.map((stock: {
        stock_code: string;
        stock_name: string;
        current_price: number;
        quantity: number;
        currency: string;
        price_updated_at: string | null;
        target_pct: number | null;
      }) => {
        const priceInKrw =
          stock.currency === "USD"
            ? stock.current_price * exchangeRate
            : stock.current_price;

        // 가격 데이터 신선도 확인
        if (stock.price_updated_at) {
          const updatedAt = new Date(stock.price_updated_at);
          const diffHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
          if (diffHours > PRICE_STALE_HOURS) hasStalePrice = true;
        } else {
          hasStalePrice = true;
        }

        return {
          stock_code: stock.stock_code,
          stock_name: stock.stock_name,
          current_price: priceInKrw,
          quantity: stock.quantity,
          eval_amount: priceInKrw * stock.quantity,
          current_pct: 0,
          target_pct: stock.target_pct ?? 0,
          currency: stock.currency,
        };
      });

      if (portfolioItems.length === 0) continue;

      // 3e. Drift 계산 (use effectiveThreshold for filtering)
      const drifts = calculateDrift(portfolioItems);
      const portfolioNeedsRebalancing = needsRebalancing(drifts, effectiveThreshold);
      const maxDrift = getMaxDrift(drifts);

      if (portfolioNeedsRebalancing) {
        userNeedsRebalancing = true;
        driftedPortfolios.push({
          name: portfolio.name,
          maxDrift,
          thresholdPct,
          driftedStocks: drifts
            .filter((d) => Math.abs(d.drift_pct) > effectiveThreshold)
            .map((d) => ({
              name: d.stock_name,
              currentPct: d.current_pct,
              targetPct: d.target_pct,
              driftPct: d.drift_pct,
            })),
        });
      }
    }

    // 3f. 리밸런싱 필요 시 알림 발송 처리
    if (userNeedsRebalancing && driftedPortfolios.length > 0) {
      // 플랜 게이트 확인
      const plan = await getUserSubscriptionPlan(supabase, userId);
      const monthlyCount = await getMonthlyDriftAlertCount(supabase, userId);

      if (!canSendDriftAlert(plan, monthlyCount)) {
        skippedCount++;
        continue;
      }

      // Change 4: Handle alert_mode 'digest' - Accumulation Phase
      if (pref.alert_mode === "digest") {
        // Deduplication: skip if a digest_pending row already exists for today
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const { count: existingDigestCount } = await supabase
          .from("notification_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("notification_type", "drift_alert")
          .eq("status", "digest_pending")
          .gte("created_at", todayStart.toISOString());

        if ((existingDigestCount ?? 0) > 0) {
          skippedCount++;
          continue; // Already recorded today's snapshot
        }

        // Digest mode: save as digest_pending, don't send email
        await supabase.from("notification_log").insert({
          user_id: userId,
          notification_type: "drift_alert",
          title: "포트폴리오 드리프트 감지 (다이제스트 대기)",
          status: "digest_pending",
          metadata: {
            max_drift_pct: Math.max(...driftedPortfolios.map((p) => p.maxDrift)),
            threshold_pct: thresholdPct,
            portfolio_count: driftedPortfolios.length,
            portfolios: driftedPortfolios, // Store full data for later digest
            plan,
            is_approximate: hasStalePrice,
          },
        });
        // Don't update last_notified_at (keep accumulating)
        processedCount++;
        continue; // Skip email sending
      }

      // 이메일 주소 결정
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const emailAddress = pref.email_address ?? userData?.user?.email;
      if (!emailAddress) {
        skippedCount++;
        continue;
      }

      const userName = emailAddress.split("@")[0];

      // notification_log 삽입 (pending 상태)
      const { data: logEntry, error: logError } = await supabase
        .from("notification_log")
        .insert({
          user_id: userId,
          notification_type: "drift_alert",
          title: "⚠️ 포트폴리오 리밸런싱이 필요합니다",
          status: "pending",
          metadata: {
            max_drift_pct: Math.max(...driftedPortfolios.map((p) => p.maxDrift)),
            threshold_pct: thresholdPct,
            portfolio_count: driftedPortfolios.length,
            plan,
          },
        })
        .select("id")
        .single();

      if (logError) {
        console.error(`[check-drift] notification_log 삽입 실패 (user: ${userId}):`, logError);
        continue;
      }

      // 이메일 생성 + 발송
      const unsubscribeUrl = `${appUrl}/api/notification/unsubscribe?token=${pref.unsubscribe_token}`;
      const { subject, html } = driftAlertTemplate(
        {
          userName,
          portfolios: driftedPortfolios,
          isApproximate: hasStalePrice,
        },
        unsubscribeUrl
      );

      const result = await sendEmail({
        to: emailAddress,
        subject,
        html,
        unsubscribeToken: pref.unsubscribe_token,
      });

      if (result.success) {
        await supabase
          .from("notification_log")
          .update({ status: "sent", sent_at: now.toISOString() })
          .eq("id", logEntry.id);
      } else {
        // 첫 실패는 retrying으로 설정하여 재시도 큐에 진입
        await supabase
          .from("notification_log")
          .update({ status: "retrying", error_message: result.error })
          .eq("id", logEntry.id);
        console.error(`[check-drift] 이메일 발송 실패, 재시도 예정 (user: ${userId}):`, result.error);
      }

      // last_notified_at, next_check_at 업데이트
      await supabase
        .from("notification_preferences")
        .update({
          last_notified_at: now.toISOString(),
          next_check_at: calculateNextCheckAt(cooldownDays).toISOString(),
        })
        .eq("user_id", userId);

      processedCount++;
    } else {
      skippedCount++;
    }
  }

  // 5. 재시도 큐 처리: status='retrying' AND retry_count < 3
  const { data: retryItems } = await supabase
    .from("notification_log")
    .select("id, user_id, retry_count")
    .eq("status", "retrying")
    .lt("retry_count", 3);

  let retryProcessed = 0;
  if (retryItems && retryItems.length > 0) {
    for (const item of retryItems) {
      const newRetryCount = (item.retry_count ?? 0) + 1;

      if (newRetryCount >= 3) {
        // 최대 재시도 초과 → 실패 처리
        await supabase
          .from("notification_log")
          .update({
            retry_count: newRetryCount,
            status: "failed",
            error_message: "최대 재시도 횟수(3회) 초과",
          })
          .eq("id", item.id);
      } else {
        // 재시도 카운트 증가 (다음 cron에서 재시도)
        await supabase
          .from("notification_log")
          .update({
            retry_count: newRetryCount,
            status: "retrying",
          })
          .eq("id", item.id);
      }

      retryProcessed++;
    }
  }

  // 6. 다이제스트 발송 단계: 쿨다운 만료된 다이제스트 사용자 처리
  let digestProcessed = 0;

  const { data: digestUsers } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("alert_mode", "digest")
    .eq("notification_enabled", true)
    .eq("email_enabled", true);

  if (digestUsers && digestUsers.length > 0) {
    for (const digestPref of digestUsers) {
      const digestUserId = digestPref.user_id;

      // Check cooldown
      if (digestPref.last_notified_at) {
        const lastNotified = new Date(digestPref.last_notified_at);
        const cooldownUntil = new Date(lastNotified);
        cooldownUntil.setDate(cooldownUntil.getDate() + (digestPref.cooldown_days ?? 7));
        if (cooldownUntil > now) continue;
      }

      // Get pending digest items
      const { data: digestItems } = await supabase
        .from("notification_log")
        .select("*")
        .eq("user_id", digestUserId)
        .eq("status", "digest_pending")
        .order("created_at", { ascending: true });

      if (!digestItems || digestItems.length === 0) continue;

      // Plan gate check
      const digestPlan = await getUserSubscriptionPlan(supabase, digestUserId);
      if (!canUseDriftDigest(digestPlan)) continue;

      // Get email address
      const { data: digestUserData } = await supabase.auth.admin.getUserById(digestUserId);
      const digestEmail = digestPref.email_address ?? digestUserData?.user?.email;
      if (!digestEmail) continue;

      const digestUserName = digestEmail.split("@")[0];

      // Build digest data from accumulated logs
      const dailySnapshots = digestItems.map((item: { created_at: string; metadata: { portfolios?: Array<{ name: string; maxDrift: number; thresholdPct: number; driftedStocks: Array<{ name: string; currentPct: number; targetPct: number; driftPct: number }> }> } }) => ({
        date: new Date(item.created_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
        portfolios: (item.metadata?.portfolios ?? []) as Array<{
          name: string;
          maxDrift: number;
          thresholdPct: number;
          driftedStocks: Array<{ name: string; currentPct: number; targetPct: number; driftPct: number }>;
        }>,
      }));

      const firstDate = new Date(digestItems[0].created_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
      const lastDate = new Date(digestItems[digestItems.length - 1].created_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });

      const unsubscribeUrl = `${appUrl}/api/notification/unsubscribe?token=${digestPref.unsubscribe_token}`;
      const { subject, html } = digestAlertTemplate(
        {
          userName: digestUserName,
          digestPeriod: { from: firstDate, to: lastDate },
          dailySnapshots,
          isApproximate: digestItems.some((item: { metadata?: { is_approximate?: boolean } }) => item.metadata?.is_approximate === true),
        },
        unsubscribeUrl,
      );

      const result = await sendEmail({ to: digestEmail, subject, html, unsubscribeToken: digestPref.unsubscribe_token });

      if (result.success) {
        // Mark all digest_pending items as sent
        const digestIds = digestItems.map((item: { id: string }) => item.id);
        await supabase
          .from("notification_log")
          .update({ status: "sent", sent_at: now.toISOString() })
          .in("id", digestIds);

        // Update last_notified_at and next_check_at
        await supabase
          .from("notification_preferences")
          .update({
            last_notified_at: now.toISOString(),
            next_check_at: calculateNextCheckAt(digestPref.cooldown_days ?? 7).toISOString(),
          })
          .eq("user_id", digestUserId);

        digestProcessed++;
      } else {
        console.error(`[check-drift] 다이제스트 발송 실패 (user: ${digestUserId}):`, result.error);
      }
    }
  }

  return NextResponse.json({
    message: "Drift check completed",
    processed: processedCount,
    skipped: skippedCount,
    retryProcessed,
    digestProcessed,
    checkedAt: now.toISOString(),
  });
}
