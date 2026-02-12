import { NextRequest, NextResponse } from "next/server";
import { getStockInfo } from "@/lib/kiwoom/client";
import { KiwoomApiError } from "@/lib/kiwoom/errors";
import { requirePlan } from "@/lib/subscription/guard";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await requirePlan("pro");
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  const { code } = await params;

  if (!code) {
    return NextResponse.json(
      { error: "종목 코드가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const stockInfo = await getStockInfo(code);
    return NextResponse.json(stockInfo);
  } catch (error) {
    if (error instanceof KiwoomApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 500 }
      );
    }
    return NextResponse.json(
      { error: "종목 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
