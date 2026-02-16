import type { PortfolioItem, Stock, TargetAllocation } from "./types";

/** Stock[] → PortfolioItem[] 변환 (현금 포함) */
export function toPortfolioItems(
  stocks: Stock[],
  targets: TargetAllocation[],
  cashAmount: number
): PortfolioItem[] {
  const stockEval = stocks.reduce((sum, s) => sum + s.eval_amount, 0);
  const totalValue = stockEval + cashAmount;
  const targetMap = new Map(
    targets.map((t) => [t.stock_code, t.target_pct])
  );

  const items: PortfolioItem[] = stocks.map((s) => ({
    stock_code: s.stock_code,
    stock_name: s.stock_name,
    current_price: s.current_price,
    quantity: s.quantity,
    eval_amount: s.eval_amount,
    current_pct: totalValue > 0 ? (s.eval_amount / totalValue) * 100 : 0,
    target_pct: targetMap.get(s.stock_code) ?? 0,
  }));

  // 현금을 PortfolioItem으로 추가
  items.push({
    stock_code: "CASH",
    stock_name: "현금",
    current_price: 1,
    quantity: cashAmount,
    eval_amount: cashAmount,
    current_pct: totalValue > 0 ? (cashAmount / totalValue) * 100 : 0,
    target_pct: targetMap.get("CASH") ?? 0,
    is_cash: true,
  });

  return items;
}

/** 균등 배분 목표 생성 */
export function createEqualTargets(
  stocks: Stock[]
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
