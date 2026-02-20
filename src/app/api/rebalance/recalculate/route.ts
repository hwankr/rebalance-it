import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/subscription/guard";
import { calculateRebalance } from "@/lib/rebalance/calculator";
import { fetchStockPrice } from "@/lib/stock-price";
import type { PortfolioItem, TargetAllocation } from "@/lib/rebalance/types";
import type {
  ExecutionOrderResult,
  PortfolioSnapshot,
} from "@/lib/rebalance/history-types";

interface RecalculateRequestBody {
  execution_id: string;
  portfolio_id: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  orders: ExecutionOrderResult[];
  portfolio_snapshot: PortfolioSnapshot;
  portfolio_id: string;
}

interface ManualStock {
  stock_code: string;
  stock_name: string;
  quantity: number;
  current_price: number;
  currency: string;
  target_pct: number;
  is_rebalance_tracked: boolean;
}

export async function POST(request: NextRequest) {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAuth());
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  let body: RecalculateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 요청 본문입니다." },
      { status: 400 }
    );
  }

  if (!body.execution_id || !body.portfolio_id) {
    return NextResponse.json(
      { error: "execution_id, portfolio_id는 필수 항목입니다." },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch the active session
    const { data: session, error: sessionError } = await supabase
      .from("executions")
      .select("*")
      .eq("id", body.execution_id)
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "진행중인 세션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const typedSession = session as unknown as SessionRow;
    const orders = typedSession.orders;
    const snapshot = typedSession.portfolio_snapshot;

    // 2. Fetch current manual_stocks with target_pct
    const { data: manualStocks, error: stocksError } = await supabase
      .from("manual_stocks")
      .select("stock_code, stock_name, quantity, current_price, currency, target_pct, is_rebalance_tracked")
      .eq("portfolio_id", body.portfolio_id);

    if (stocksError) {
      return NextResponse.json(
        { error: "포트폴리오 데이터를 불러올 수 없습니다." },
        { status: 500 }
      );
    }

    const stocks = (manualStocks ?? []) as unknown as ManualStock[];

    // 3. Use exchange rate from session snapshot
    const exchangeRate = snapshot.exchange_rate ?? 1;

    // 4. Fetch current prices for all stocks in the session
    const sessionStockCodes = new Set(orders.map((o) => o.stock_code));
    const priceMap = new Map<string, number>();

    // Look up market info from stocks dictionary (needed for Yahoo Finance ticker suffix)
    const { data: stockDict } = await supabase
      .from("stocks")
      .select("stock_code, market")
      .in("stock_code", Array.from(sessionStockCodes));
    const marketMap = new Map<string, string>();
    if (stockDict) {
      for (const s of stockDict) {
        marketMap.set(s.stock_code, s.market);
      }
    }

    const pricePromises = Array.from(sessionStockCodes).map(async (code) => {
      const stock = stocks.find((s) => s.stock_code === code);
      const snapshotStock = snapshot.stocks.find((s) => s.stock_code === code);
      try {
        const result = await fetchStockPrice(code, {
          currency: stock?.currency,
          market: marketMap.get(code),
        });
        priceMap.set(code, result.price);
      } catch {
        // Fallback to manual_stocks current_price (native currency)
        // Note: snapshotStock.price is KRW-normalized, so un-normalize for USD stocks
        const nativeFallback = stock?.current_price ?? (
          snapshotStock?.price
            ? (stock?.currency === "USD" && exchangeRate > 0
              ? snapshotStock.price / exchangeRate
              : snapshotStock.price)
            : 0
        );
        if (nativeFallback > 0) priceMap.set(code, nativeFallback);
      }
    });
    await Promise.allSettled(pricePromises);

    // 5. Reconstruct post-execution portfolio state
    // Start with snapshot quantities
    const stockQuantities = new Map<string, number>();
    const stockCurrencies = new Map<string, string>();
    for (const s of snapshot.stocks) {
      stockQuantities.set(s.stock_code, s.quantity);
    }
    for (const s of stocks) {
      stockCurrencies.set(s.stock_code, s.currency ?? "KRW");
    }

    let postExecCash = snapshot.cash;

    // Apply already-executed orders
    // NOTE: estimated_price와 actual_price는 모두 KRW 정규화된 값이므로
    // 환율 추가 적용 없이 그대로 사용한다. (USD 종목도 이미 KRW로 변환됨)
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

    // 6. Build PortfolioItem[] with current prices (tracked stocks only)
    const trackedStocks = stocks.filter((s) => s.is_rebalance_tracked !== false);
    const trackedStockCodes = new Set(trackedStocks.map((s) => s.stock_code));
    const targetMap = new Map(trackedStocks.map((s) => [s.stock_code, s.target_pct]));
    const portfolioItems: PortfolioItem[] = [];
    let totalValue = postExecCash;

    // Calculate eval_amounts first for current_pct (tracked stocks only)
    const evalAmounts = new Map<string, number>();
    for (const [code, qty] of stockQuantities) {
      if (qty <= 0) continue;
      if (!trackedStockCodes.has(code)) continue;
      const freshPrice = priceMap.get(code) ?? 0;
      const currency = stockCurrencies.get(code) ?? "KRW";
      const evalAmount = currency === "USD"
        ? freshPrice * exchangeRate * qty
        : freshPrice * qty;
      evalAmounts.set(code, evalAmount);
      totalValue += evalAmount;
    }

    for (const [code, qty] of stockQuantities) {
      if (!trackedStockCodes.has(code)) continue;
      const hasTarget = (targetMap.get(code) ?? 0) > 0;
      if (qty <= 0 && !hasTarget) continue;
      const freshPrice = priceMap.get(code) ?? 0;
      const currency = stockCurrencies.get(code) ?? "KRW";
      // PortfolioItem uses KRW-normalized prices
      const normalizedPrice = currency === "USD" ? freshPrice * exchangeRate : freshPrice;
      const evalAmount = evalAmounts.get(code) ?? 0;

      portfolioItems.push({
        stock_code: code,
        stock_name: stocks.find((s) => s.stock_code === code)?.stock_name
          ?? snapshot.stocks.find((s) => s.stock_code === code)?.stock_name
          ?? code,
        current_price: normalizedPrice,
        quantity: qty,
        eval_amount: evalAmount,
        current_pct: totalValue > 0 ? (evalAmount / totalValue) * 100 : 0,
        target_pct: targetMap.get(code) ?? 0,
        currency,
      });
    }

    // Add cash
    portfolioItems.push({
      stock_code: "CASH",
      stock_name: "현금",
      current_price: 1,
      quantity: postExecCash,
      eval_amount: postExecCash,
      current_pct: totalValue > 0 ? (postExecCash / totalValue) * 100 : 0,
      target_pct: targetMap.get("CASH") ?? 0,
      is_cash: true,
    });

    // 7. Build targets from current manual_stocks (tracked only)
    const targets: TargetAllocation[] = trackedStocks.map((s) => ({
      stock_code: s.stock_code,
      stock_name: s.stock_name,
      target_pct: s.target_pct,
    }));

    // Add cash target if needed
    const totalStockTarget = targets.reduce((sum, t) => sum + t.target_pct, 0);
    if (totalStockTarget < 100) {
      targets.push({
        stock_code: "CASH",
        stock_name: "현금",
        target_pct: Math.max(0, 100 - totalStockTarget),
        is_cash: true,
      });
    }

    // 8. Run calculateRebalance
    const rebalanceResult = calculateRebalance(portfolioItems, targets);

    // 9. Filter: only keep orders for stocks in the original session
    const newOrdersFiltered = rebalanceResult.orders.filter((o) =>
      sessionStockCodes.has(o.stock_code)
    );

    // 10. Merge: keep executed orders, replace unexecuted
    const mergedOrders: ExecutionOrderResult[] = [];
    const processedStocks = new Set<string>();

    for (const existingOrder of orders) {
      const execQty = existingOrder.executed_quantity ?? 0;
      const newOrder = newOrdersFiltered.find(
        (o) => o.stock_code === existingOrder.stock_code && o.side === existingOrder.side
      );

      if (execQty > 0) {
        // This order has been partially/fully executed — keep it
        const newQuantity = newOrder?.quantity ?? 0;
        const isOverExecuted = execQty > newQuantity && newQuantity > 0;
        const isNoLongerNeeded = newQuantity === 0 && execQty > 0;

        mergedOrders.push({
          ...existingOrder,
          quantity: isNoLongerNeeded ? 0 : (newQuantity > 0 ? newQuantity : existingOrder.quantity),
          original_quantity: existingOrder.quantity,
          over_executed: isOverExecuted || isNoLongerNeeded,
          // Update price/amount from recalculated order when available
          ...(newOrder ? {
            estimated_price: newOrder.estimated_price,
            estimated_amount: newOrder.estimated_amount,
          } : isNoLongerNeeded ? {
            estimated_amount: 0,
          } : {}),
        });
        processedStocks.add(`${existingOrder.stock_code}-${existingOrder.side}`);
      } else if (newOrder) {
        // Unexecuted order with a recalculated replacement
        mergedOrders.push({
          stock_code: newOrder.stock_code,
          stock_name: newOrder.stock_name,
          side: newOrder.side,
          quantity: newOrder.quantity,
          estimated_price: newOrder.estimated_price,
          estimated_amount: newOrder.estimated_amount,
          success: false,
          executed: false,
          executed_quantity: 0,
          currency: existingOrder.currency,
          original_quantity: existingOrder.quantity,
        });
        processedStocks.add(`${existingOrder.stock_code}-${existingOrder.side}`);
      } else {
        // Order no longer needed after recalculation
        mergedOrders.push({
          ...existingOrder,
          original_quantity: existingOrder.quantity,
          quantity: 0,
          resolved_by_recalc: true,
        });
        processedStocks.add(`${existingOrder.stock_code}-${existingOrder.side}`);
      }
    }

    // Add any new orders from recalculation that weren't in the original session
    // (only for stocks already in the session universe)
    for (const newOrder of newOrdersFiltered) {
      const key = `${newOrder.stock_code}-${newOrder.side}`;
      if (!processedStocks.has(key)) {
        mergedOrders.push({
          stock_code: newOrder.stock_code,
          stock_name: newOrder.stock_name,
          side: newOrder.side,
          quantity: newOrder.quantity,
          estimated_price: newOrder.estimated_price,
          estimated_amount: newOrder.estimated_amount,
          success: false,
          executed: false,
          executed_quantity: 0,
          currency: stockCurrencies.get(newOrder.stock_code) ?? "KRW",
        });
      }
    }

    // Calculate new totals
    const activeOrders = mergedOrders.filter((o) => !o.resolved_by_recalc);
    const newTotalSell = activeOrders
      .filter((o) => o.side === "sell")
      .reduce((sum, o) => sum + o.estimated_amount, 0);
    const newTotalBuy = activeOrders
      .filter((o) => o.side === "buy")
      .reduce((sum, o) => sum + o.estimated_amount, 0);
    const newNetCash = newTotalSell - newTotalBuy;

    // Build recalculated prices map
    const recalculatedPrices: Record<string, number> = {};
    for (const [code, price] of priceMap) {
      recalculatedPrices[code] = price;
    }

    // 11. Atomically update session via RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase.rpc as any)("recalculate_session_orders", {
      p_execution_id: body.execution_id,
      p_new_orders: JSON.parse(JSON.stringify(mergedOrders)),
      p_total_buy_amount: newTotalBuy,
      p_total_sell_amount: newTotalSell,
      p_net_cash_change: newNetCash,
      p_recalculated_prices: recalculatedPrices,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: `재계산 저장에 실패했습니다: ${rpcError.message}` },
        { status: 500 }
      );
    }

    // 12. Return updated data
    return NextResponse.json({
      orders: mergedOrders,
      total_buy_amount: newTotalBuy,
      total_sell_amount: newTotalSell,
      net_cash_change: newNetCash,
      recalculated_prices: recalculatedPrices,
      cash_sufficient: newTotalBuy <= postExecCash + newTotalSell,
      cash_shortfall: Math.max(0, newTotalBuy - postExecCash - newTotalSell),
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "잔여 주문 재계산 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
