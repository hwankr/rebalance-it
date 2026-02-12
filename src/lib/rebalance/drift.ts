import type { PortfolioItem, DriftResult } from "./types";

/** 현재 포트폴리오와 목표 비중의 차이(drift) 계산 */
export function calculateDrift(portfolio: PortfolioItem[]): DriftResult[] {
  const totalValue = portfolio.reduce((sum, item) => sum + item.eval_amount, 0);

  return portfolio.map((item) => {
    const current_pct =
      totalValue > 0 ? (item.eval_amount / totalValue) * 100 : 0;
    const drift_pct = item.target_pct - current_pct;
    const drift_amount = (drift_pct / 100) * totalValue;

    return {
      stock_code: item.stock_code,
      stock_name: item.stock_name,
      current_pct: Math.round(current_pct * 100) / 100,
      target_pct: item.target_pct,
      drift_pct: Math.round(drift_pct * 100) / 100,
      drift_amount: Math.round(drift_amount),
    };
  });
}

/** 임계값을 초과하는 drift가 있는지 확인 */
export function needsRebalancing(
  drifts: DriftResult[],
  threshold: number
): boolean {
  return drifts.some((d) => Math.abs(d.drift_pct) > threshold);
}

/** 가장 큰 drift 값 반환 */
export function getMaxDrift(drifts: DriftResult[]): number {
  if (drifts.length === 0) return 0;
  return Math.max(...drifts.map((d) => Math.abs(d.drift_pct)));
}
