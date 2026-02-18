import { NextRequest, NextResponse } from "next/server";
import { fetchStockFinancials } from "@/lib/stock-financials";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const market = searchParams.get("market") ?? undefined;

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const financials = await fetchStockFinancials(code, { market });
    return NextResponse.json(financials);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "재무 데이터 조회 실패" },
      { status: 500 },
    );
  }
}
