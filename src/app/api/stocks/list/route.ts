import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const assetTypeFilter = searchParams.get("asset_type");

  // Supabase PostgREST defaults to 1000 rows per query.
  // Paginate to fetch all active stocks (KR + US).
  const allStocks: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("stocks")
      .select("stock_code, stock_name, stock_name_ko, market, country, currency, asset_type")
      .eq("is_active", true)
      .order("stock_code")
      .range(from, from + PAGE_SIZE - 1);

    if (assetTypeFilter && ["STOCK", "ETF"].includes(assetTypeFilter)) {
      query = query.eq("asset_type", assetTypeFilter);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json([]);
    }

    if (!data || data.length === 0) break;

    allStocks.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  if (allStocks.length === 0) {
    return NextResponse.json([]);
  }

  return NextResponse.json(allStocks, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      "X-Stock-Count": allStocks.length.toString(),
    },
  });
}
