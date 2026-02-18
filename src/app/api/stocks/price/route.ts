import { NextRequest, NextResponse } from "next/server";
import { fetchStockPrice } from "@/lib/stock-price";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const currency = searchParams.get("currency") ?? "KRW";
  let market = searchParams.get("market") ?? undefined;

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  // market이 없으면 stocks 참조 테이블에서 조회 (한국 주식/ETF KOSPI/KOSDAQ 구분 필요)
  if (!market) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from("stocks")
        .select("market")
        .eq("stock_code", code)
        .single();
      if (data?.market) market = data.market;
    } catch {
      // stocks 테이블 조회 실패 시 market 없이 진행
    }
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
