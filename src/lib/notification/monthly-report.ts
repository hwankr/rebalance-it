import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateDrift, needsRebalancing, getMaxDrift } from "@/lib/rebalance/drift";
import type { PortfolioItem, DriftResult } from "@/lib/rebalance/types";

export interface MonthlyReportData {
  userName: string;
  reportMonth: string; // "2026년 2월"
  totalAsset: number;
  totalAssetChange: number;
  totalAssetChangePct: number;
  portfolios: {
    name: string;
    totalValue: number;
    stockCount: number;
    maxDrift: number;
    thresholdPct: number;
    needsRebalancing: boolean;
    driftedStocks: {
      name: string;
      currentPct: number;
      targetPct: number;
      driftPct: number;
    }[];
  }[];
  rebalancingActivity: {
    executionCount: number;
    completedSessions: number;
    inProgressSessions: number;
  };
}

/** 월간 리포트 데이터 수집 */
export async function collectMonthlyReportData(
  supabase: SupabaseClient,
  userId: string,
  exchangeRate: number
): Promise<MonthlyReportData | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 사용자 이메일 (이름 대용)
  const { data: userData } = await db.auth.admin.getUserById(userId);
  const userName = userData?.user?.email?.split("@")[0] ?? "사용자";

  // 현재 월 정보
  const now = new Date();
  const reportMonth = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  // 포트폴리오 조회
  const { data: portfolios } = await db
    .from("manual_portfolios")
    .select("id, name")
    .eq("user_id", userId);

  if (!portfolios || portfolios.length === 0) return null;

  // 리밸런싱 설정
  const { data: rebalanceSettings } = await db
    .from("rebalance_settings")
    .select("threshold_pct")
    .eq("user_id", userId)
    .single();

  const thresholdPct: number = rebalanceSettings?.threshold_pct ?? 5;

  let totalAsset = 0;
  const portfolioData: MonthlyReportData["portfolios"] = [];

  for (const portfolio of portfolios) {
    const { data: stocks } = await db
      .from("manual_stocks")
      .select("stock_code, stock_name, current_price, quantity, currency, target_pct")
      .eq("portfolio_id", portfolio.id)
      .eq("is_rebalance_tracked", true);

    if (!stocks || stocks.length === 0) continue;

    // PortfolioItem 배열 구성
    const items: PortfolioItem[] = stocks.map(
      (stock: {
        stock_code: string;
        stock_name: string;
        current_price: number;
        quantity: number;
        currency: string;
        target_pct: number | null;
      }) => {
        const priceInKrw =
          stock.currency === "USD"
            ? stock.current_price * exchangeRate
            : stock.current_price;

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
      }
    );

    const portfolioValue = items.reduce((sum, item) => sum + item.eval_amount, 0);
    totalAsset += portfolioValue;

    const drifts: DriftResult[] = calculateDrift(items);
    const maxDrift = getMaxDrift(drifts);
    const portfolioNeedsRebalancing = needsRebalancing(drifts, thresholdPct);

    // 임계치 초과 종목만 추출
    const driftedStocks = drifts
      .filter((d) => Math.abs(d.drift_pct) > thresholdPct)
      .map((d) => ({
        name: d.stock_name,
        currentPct: d.current_pct,
        targetPct: d.target_pct,
        driftPct: d.drift_pct,
      }));

    portfolioData.push({
      name: portfolio.name,
      totalValue: portfolioValue,
      stockCount: stocks.length,
      maxDrift,
      thresholdPct,
      needsRebalancing: portfolioNeedsRebalancing,
      driftedStocks,
    });
  }

  if (portfolioData.length === 0) return null;

  // 전월 대비 변동 계산 (executions 기반)
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const { data: lastMonthExecution } = await db
    .from("executions")
    .select("metadata")
    .eq("user_id", userId)
    .gte("created_at", prevMonthStart.toISOString())
    .lt("created_at", monthStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let totalAssetChange = 0;
  let totalAssetChangePct = 0;
  if (lastMonthExecution?.metadata?.total_value) {
    const prevTotal = lastMonthExecution.metadata.total_value as number;
    totalAssetChange = totalAsset - prevTotal;
    totalAssetChangePct = prevTotal > 0 ? (totalAssetChange / prevTotal) * 100 : 0;
  }

  // 이번 달 리밸런싱 활동
  const { count: executionCount } = await db
    .from("executions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart.toISOString());

  const { count: completedSessions } = await db
    .from("executions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("created_at", monthStart.toISOString());

  const { count: inProgressSessions } = await db
    .from("executions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .gte("created_at", monthStart.toISOString());

  return {
    userName,
    reportMonth,
    totalAsset,
    totalAssetChange,
    totalAssetChangePct,
    portfolios: portfolioData,
    rebalancingActivity: {
      executionCount: executionCount ?? 0,
      completedSessions: completedSessions ?? 0,
      inProgressSessions: inProgressSessions ?? 0,
    },
  };
}
