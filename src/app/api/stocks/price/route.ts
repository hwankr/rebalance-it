import { NextRequest, NextResponse } from "next/server";
import { fetchStockPrice } from "@/lib/stock-price";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const currency = searchParams.get("currency") ?? "KRW";
  const market = searchParams.get("market") ?? undefined;

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const { price, marketTime, exchangeName } = await fetchStockPrice(code, { currency, market });
    return NextResponse.json({ price, currency, marketTime, exchangeName });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "가격 조회 실패" },
      { status: 500 },
    );
  }
}
