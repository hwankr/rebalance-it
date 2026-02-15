import type {
  PortfolioItem,
  TargetAllocation,
  RebalanceResult,
} from "./types";
import { calculateDrift } from "./drift";
import { generateOrders, validateCashSufficiency } from "./order-generator";

/** 목표 비중 합계 검증 (100% 이하여야 함. 나머지는 현금) */
export function validateTargets(
  targets: TargetAllocation[]
): { valid: boolean; total: number; message?: string } {
  const total = targets.reduce((sum, t) => sum + t.target_pct, 0);
  const rounded = Math.round(total * 100) / 100;

  if (rounded > 100) {
    return {
      valid: false,
      total: rounded,
      message: `목표 비중 합계가 100%를 초과합니다: ${rounded}%`,
    };
  }

  if (targets.some((t) => t.target_pct < 0)) {
    return {
      valid: false,
      total: rounded,
      message: "목표 비중은 0% 이상이어야 합니다.",
    };
  }

  return { valid: true, total: rounded };
}

/** 포트폴리오 아이템에 목표 비중을 매핑 */
export function mergeTargets(
  portfolio: PortfolioItem[],
  targets: TargetAllocation[]
): PortfolioItem[] {
  const targetMap = new Map(
    targets.map((t) => [t.stock_code, t.target_pct])
  );

  return portfolio.map((item) => ({
    ...item,
    target_pct: targetMap.get(item.stock_code) ?? 0,
  }));
}

/** 리밸런싱 계산 (시뮬레이션) — 현금은 portfolio에 포함되어 있어야 함 */
export function calculateRebalance(
  portfolio: PortfolioItem[],
  targets: TargetAllocation[]
): RebalanceResult {
  // 목표 비중 검증
  const validation = validateTargets(targets);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // 목표 비중 매핑
  const merged = mergeTargets(portfolio, targets);

  // totalValue: portfolio에 현금이 이미 포함되어 있으므로 eval_amount 합계만 사용
  const totalValue = merged.reduce((sum, item) => sum + item.eval_amount, 0);

  // 현재 drift 계산
  const drift_before = calculateDrift(merged);

  // 주문 생성 (is_cash 항목은 내부에서 skip됨)
  const orders = generateOrders(merged, totalValue);

  // 매수/매도 총액
  const total_sell_amount = orders
    .filter((o) => o.side === "sell")
    .reduce((sum, o) => sum + o.estimated_amount, 0);
  const total_buy_amount = orders
    .filter((o) => o.side === "buy")
    .reduce((sum, o) => sum + o.estimated_amount, 0);
  const net_cash_change = total_sell_amount - total_buy_amount;

  // 리밸런싱 후 예상 drift 계산
  const estimatedPortfolio = merged.map((item) => {
    if (item.is_cash) {
      // 현금은 매매 결과에 따라 자동 조정
      return {
        ...item,
        eval_amount: item.eval_amount + net_cash_change,
        quantity: item.eval_amount + net_cash_change,
      };
    }

    const order = orders.find((o) => o.stock_code === item.stock_code);
    if (!order) return item;

    const newQuantity =
      order.side === "buy"
        ? item.quantity + order.quantity
        : item.quantity - order.quantity;

    return {
      ...item,
      quantity: newQuantity,
      eval_amount: newQuantity * item.current_price,
    };
  });

  const estimated_drift_after = calculateDrift(estimatedPortfolio);

  // 현금 잔액 계산
  const cashItem = merged.find((p) => p.is_cash);
  const cashBefore = cashItem?.eval_amount ?? 0;

  return {
    orders,
    drift_before,
    estimated_drift_after,
    total_buy_amount,
    total_sell_amount,
    net_cash_change,
    cash_after: cashBefore + net_cash_change,
  };
}

/** 현금 충분성 검증을 포함한 시뮬레이션 */
export function simulateRebalance(
  portfolio: PortfolioItem[],
  targets: TargetAllocation[]
): RebalanceResult & { cash_sufficient: boolean; cash_shortfall: number } {
  const result = calculateRebalance(portfolio, targets);
  const { sufficient, shortfall } = validateCashSufficiency(
    result.orders,
    portfolio
  );

  return {
    ...result,
    cash_sufficient: sufficient,
    cash_shortfall: shortfall,
  };
}
