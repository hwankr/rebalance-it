import type { PortfolioItem, RebalanceOrder } from "./types";
import { adjustToTickSize } from "./price-unit";

const MIN_ORDER_AMOUNT = 10_000; // 최소 주문 금액 (1만원)

/** 리밸런싱 주문 목록 생성 */
export function generateOrders(
  portfolio: PortfolioItem[],
  totalValue: number,
  cashBalance: number
): RebalanceOrder[] {
  const orders: RebalanceOrder[] = [];

  for (const item of portfolio) {
    if (item.current_price <= 0) continue;

    const targetAmount = (item.target_pct / 100) * totalValue;
    const diffAmount = targetAmount - item.eval_amount;
    const absQuantity = Math.floor(Math.abs(diffAmount) / item.current_price);

    if (absQuantity <= 0) continue;

    const estimatedPrice = adjustToTickSize(item.current_price);
    const estimatedAmount = absQuantity * estimatedPrice;

    // 최소 주문 금액 필터
    if (estimatedAmount < MIN_ORDER_AMOUNT) continue;

    orders.push({
      stock_code: item.stock_code,
      stock_name: item.stock_name,
      side: diffAmount > 0 ? "buy" : "sell",
      quantity: absQuantity,
      estimated_price: estimatedPrice,
      estimated_amount: estimatedAmount,
    });
  }

  // 매도를 먼저 안내 (현금 확보), 그 다음 매수
  return orders.sort((a, b) => {
    if (a.side === "sell" && b.side === "buy") return -1;
    if (a.side === "buy" && b.side === "sell") return 1;
    return 0;
  });
}

/** 매수 주문의 총 필요 금액이 사용 가능 현금을 초과하는지 확인 */
export function validateCashSufficiency(
  orders: RebalanceOrder[],
  cashBalance: number
): { sufficient: boolean; shortfall: number } {
  const totalSell = orders
    .filter((o) => o.side === "sell")
    .reduce((sum, o) => sum + o.estimated_amount, 0);
  const totalBuy = orders
    .filter((o) => o.side === "buy")
    .reduce((sum, o) => sum + o.estimated_amount, 0);

  const availableCash = cashBalance + totalSell;
  const shortfall = Math.max(0, totalBuy - availableCash);

  return {
    sufficient: shortfall === 0,
    shortfall,
  };
}
