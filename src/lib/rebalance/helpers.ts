import type { KiwoomStock } from "@/lib/kiwoom/types";
import type { PortfolioItem, TargetAllocation } from "./types";

/** KiwoomStock[] → PortfolioItem[] 변환 */
export function toPortfolioItems(
  stocks: KiwoomStock[],
  targets?: TargetAllocation[]
): PortfolioItem[] {
  const totalValue = stocks.reduce((sum, s) => sum + s.eval_amount, 0);
  const targetMap = new Map(
    targets?.map((t) => [t.stock_code, t.target_pct]) ?? []
  );

  return stocks.map((s) => ({
    stock_code: s.stock_code,
    stock_name: s.stock_name,
    current_price: s.current_price,
    quantity: s.quantity,
    eval_amount: s.eval_amount,
    current_pct: totalValue > 0 ? (s.eval_amount / totalValue) * 100 : 0,
    target_pct: targetMap.get(s.stock_code) ?? 0,
  }));
}

/** 균등 배분 목표 생성 */
export function createEqualTargets(
  stocks: KiwoomStock[]
): TargetAllocation[] {
  const pct =
    stocks.length > 0
      ? Math.round((100 / stocks.length) * 100) / 100
      : 0;
  return stocks.map((s) => ({
    stock_code: s.stock_code,
    stock_name: s.stock_name,
    target_pct: pct,
  }));
}
