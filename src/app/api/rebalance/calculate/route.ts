import { NextRequest, NextResponse } from "next/server";
import { simulateRebalance } from "@/lib/rebalance/calculator";
import type { PortfolioItem, TargetAllocation } from "@/lib/rebalance/types";
import { requireAuth } from "@/lib/subscription/guard";

interface CalculateRequestBody {
  portfolio: PortfolioItem[];
  targets: TargetAllocation[];
  cash: number;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  let body: CalculateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 요청 본문입니다." },
      { status: 400 }
    );
  }

  if (!body.portfolio || !body.targets || body.cash == null) {
    return NextResponse.json(
      { error: "portfolio, targets, cash는 필수 항목입니다." },
      { status: 400 }
    );
  }

  try {
    const result = simulateRebalance(body.portfolio, body.targets, body.cash);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "리밸런싱 계산 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
