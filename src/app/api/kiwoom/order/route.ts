import { NextRequest, NextResponse } from "next/server";
import { placeOrder, cancelOrder } from "@/lib/kiwoom/client";
import { KiwoomApiError } from "@/lib/kiwoom/errors";
import type { KiwoomOrderRequest } from "@/lib/kiwoom/types";
import { requirePlan } from "@/lib/subscription/guard";

export async function POST(request: NextRequest) {
  try {
    await requirePlan("pro");
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  let body: KiwoomOrderRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 요청 본문입니다." },
      { status: 400 }
    );
  }

  if (!body.account || !body.symbol || !body.qty || !body.side) {
    return NextResponse.json(
      { error: "account, symbol, qty, side는 필수 항목입니다." },
      { status: 400 }
    );
  }

  try {
    const result = await placeOrder(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof KiwoomApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 500 }
      );
    }
    return NextResponse.json(
      { error: "주문 실행 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requirePlan("pro");
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  const orderId = request.nextUrl.searchParams.get("orderId");
  const account = request.nextUrl.searchParams.get("account");

  if (!orderId || !account) {
    return NextResponse.json(
      { error: "orderId와 account 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const result = await cancelOrder(orderId, account);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof KiwoomApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 500 }
      );
    }
    return NextResponse.json(
      { error: "주문 취소 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
