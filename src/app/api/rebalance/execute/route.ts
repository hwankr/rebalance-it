import { NextRequest, NextResponse } from "next/server";
import { placeOrder } from "@/lib/kiwoom/client";
import { KiwoomApiError } from "@/lib/kiwoom/errors";
import type { RebalanceOrder } from "@/lib/rebalance/types";
import type { KiwoomOrderResponse } from "@/lib/kiwoom/types";

interface ExecuteRequestBody {
  orders: RebalanceOrder[];
  account: string;
}

interface OrderResult {
  stock_code: string;
  stock_name: string;
  side: "buy" | "sell";
  quantity: number;
  success: boolean;
  response?: KiwoomOrderResponse;
  error?: string;
}

export async function POST(request: NextRequest) {
  let body: ExecuteRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 요청 본문입니다." },
      { status: 400 }
    );
  }

  if (!body.orders || !body.account || body.orders.length === 0) {
    return NextResponse.json(
      { error: "orders와 account는 필수 항목입니다." },
      { status: 400 }
    );
  }

  const sellOrders = body.orders.filter((o) => o.side === "sell");
  const buyOrders = body.orders.filter((o) => o.side === "buy");

  const results: OrderResult[] = [];

  // 매도 먼저 순차 실행
  for (const order of sellOrders) {
    try {
      const response = await placeOrder({
        account: body.account,
        symbol: order.stock_code,
        qty: order.quantity,
        price: order.estimated_price,
        side: "sell",
        order_type: "limit",
      });
      results.push({
        stock_code: order.stock_code,
        stock_name: order.stock_name,
        side: "sell",
        quantity: order.quantity,
        success: response.status !== "rejected",
        response,
      });
    } catch (error) {
      results.push({
        stock_code: order.stock_code,
        stock_name: order.stock_name,
        side: "sell",
        quantity: order.quantity,
        success: false,
        error:
          error instanceof KiwoomApiError
            ? error.message
            : "주문 실행 중 오류가 발생했습니다.",
      });
    }
  }

  // 매수 나중에 순차 실행
  for (const order of buyOrders) {
    try {
      const response = await placeOrder({
        account: body.account,
        symbol: order.stock_code,
        qty: order.quantity,
        price: order.estimated_price,
        side: "buy",
        order_type: "limit",
      });
      results.push({
        stock_code: order.stock_code,
        stock_name: order.stock_name,
        side: "buy",
        quantity: order.quantity,
        success: response.status !== "rejected",
        response,
      });
    } catch (error) {
      results.push({
        stock_code: order.stock_code,
        stock_name: order.stock_name,
        side: "buy",
        quantity: order.quantity,
        success: false,
        error:
          error instanceof KiwoomApiError
            ? error.message
            : "주문 실행 중 오류가 발생했습니다.",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return NextResponse.json(
    {
      total: results.length,
      success_count: successCount,
      fail_count: failCount,
      results,
    },
    { status: failCount > 0 && successCount > 0 ? 207 : failCount > 0 ? 500 : 200 }
  );
}
