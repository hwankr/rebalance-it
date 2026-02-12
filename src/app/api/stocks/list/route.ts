import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: stocks, error } = await supabase
    .from("stocks")
    .select("stock_code, stock_name, stock_name_ko, market, country, currency")
    .eq("is_active", true)
    .order("stock_code");

  if (error || !stocks || stocks.length === 0) {
    return NextResponse.json([]);
  }

  return NextResponse.json(stocks, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
