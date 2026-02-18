import type { ExecutionOrderResult, PortfolioSnapshot } from "./history-types";

export interface EffectivePosition {
  stock_code: string;
  stock_name: string;
  quantity: number;
  eval_amount: number;
  current_pct: number;
  target_pct: number;
  drift_pct: number;
}

export interface EffectivePortfolioState {
  positions: EffectivePosition[];
  cash: number;
  total_value: number;
}

/**
 * 스냅샷 + 체결 주문 델타를 반영한 현재 포트폴리오 상태 계산.
 *
 * 이 함수는 recalculate/route.ts Step 5 (138-168행)와 동일한 로직을 구현한다.
 * 변경 시 양쪽을 동기화할 것.
 */
export function calculateEffectivePortfolio(
  snapshot: PortfolioSnapshot,
  orders: ExecutionOrderResult[],
  targetMap: Map<string, number>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currencyMap?: Map<string, string>,
): EffectivePortfolioState {
  const stockQuantities = new Map<string, number>();

  // 1. 스냅샷 수량으로 초기화
  for (const s of snapshot.stocks) {
    stockQuantities.set(s.stock_code, s.quantity);
  }

  // 2. 체결 주문 델타 적용
  // NOTE: estimated_price와 actual_price는 모두 KRW 정규화된 값이므로
  // 환율 추가 적용 없이 그대로 사용한다. (USD 종목도 이미 KRW로 변환됨)
  let postExecCash = snapshot.cash;
  for (const order of orders) {
    const execQty = order.executed_quantity ?? 0;
    if (execQty <= 0) continue;

    const price = order.actual_price ?? order.estimated_price;
    const currentQty = stockQuantities.get(order.stock_code) ?? 0;

    if (order.side === "sell") {
      stockQuantities.set(order.stock_code, currentQty - execQty);
      postExecCash += execQty * price;
    } else {
      stockQuantities.set(order.stock_code, currentQty + execQty);
      postExecCash -= execQty * price;
    }
  }

  // 3. 평가금액 계산 (스냅샷 가격 = KRW 정규화)
  const positions: EffectivePosition[] = [];
  let totalValue = postExecCash;

  for (const [code, qty] of stockQuantities) {
    if (qty <= 0) continue;
    const snapStock = snapshot.stocks.find((s) => s.stock_code === code);
    const evalAmount = (snapStock?.price ?? 0) * qty;
    totalValue += evalAmount;
    positions.push({
      stock_code: code,
      stock_name: snapStock?.stock_name ?? code,
      quantity: qty,
      eval_amount: evalAmount,
      current_pct: 0,
      target_pct: targetMap.get(code) ?? 0,
      drift_pct: 0,
    });
  }

  // 4. 비중 + drift 계산
  for (const pos of positions) {
    pos.current_pct = totalValue > 0 ? (pos.eval_amount / totalValue) * 100 : 0;
    pos.drift_pct = pos.target_pct - pos.current_pct;
  }

  // 비중 내림차순 정렬
  positions.sort((a, b) => b.current_pct - a.current_pct);

  return { positions, cash: postExecCash, total_value: totalValue };
}
