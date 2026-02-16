import { NextRequest, NextResponse } from "next/server";
import { fetchStockChart } from "@/lib/stock-price";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const { searchParams } = request.nextUrl;
  const period = (searchParams.get("period") ?? "day") as "day" | "week" | "month";
  const count = Number(searchParams.get("count") ?? "60");
  let market = searchParams.get("market") ?? undefined;

  // market이 없으면 stocks 참조 테이블에서 조회 (한국 주식 KOSPI/KOSDAQ 구분 필요)
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
    const data = await fetchStockChart(code, { period, count, market });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "차트 데이터 조회에 실패했습니다." },
      { status: 500 },
    );
  }
}
