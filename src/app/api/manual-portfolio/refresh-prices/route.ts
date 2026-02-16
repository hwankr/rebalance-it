import { NextRequest, NextResponse } from "next/server";
import { requirePlan } from "@/lib/subscription/guard";
import { fetchStockPrice } from "@/lib/stock-price";
import { getExchangeRate } from "@/lib/exchange-rate";

const MAX_STOCKS = 50;

export async function POST(request: NextRequest) {
  let user: { id: string };
  let supabase: Awaited<ReturnType<typeof requirePlan>>["supabase"];

  try {
    const auth = await requirePlan("pro");
    user = auth.user;
    supabase = auth.supabase;
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  try {
    // Parse optional portfolio_id from body
    let portfolioId: string | null = null;
    try {
      const body = await request.json();
      portfolioId = body?.portfolio_id ?? null;
    } catch {
      // No body or invalid JSON — refresh all portfolios
    }

    let portfolioIds: string[];

    if (portfolioId) {
      // Single-account mode: verify ownership
      const { data: portfolio } = await supabase
        .from("manual_portfolios")
        .select("id")
        .eq("id", portfolioId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!portfolio) {
        return NextResponse.json(
          { error: "포트폴리오를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      portfolioIds = [portfolio.id];
    } else {
      // All-account mode: get all user portfolios
      const { data: portfolios } = await supabase
        .from("manual_portfolios")
        .select("id")
        .eq("user_id", user.id);

      if (!portfolios || portfolios.length === 0) {
        return NextResponse.json(
          { error: "포트폴리오가 없습니다." },
          { status: 404 }
        );
      }
      portfolioIds = portfolios.map((p) => p.id);
    }

    // Get all stocks across selected portfolios
    const { data: manualStocks } = await supabase
      .from("manual_stocks")
      .select("id, stock_code, currency")
      .in("portfolio_id", portfolioIds)
      .limit(MAX_STOCKS);

    if (!manualStocks || manualStocks.length === 0) {
      return NextResponse.json({
        updated: 0,
        failed: 0,
        errors: [],
        exchange_rate: 0,
      });
    }

    // Look up market info from stocks dictionary
    const stockCodes = manualStocks.map((s) => s.stock_code);
    const { data: stockDict } = await supabase
      .from("stocks")
      .select("stock_code, market")
      .in("stock_code", stockCodes);

    const marketMap = new Map<string, string>();
    if (stockDict) {
      for (const s of stockDict) {
        marketMap.set(s.stock_code, s.market);
      }
    }

    const { rate: exchangeRate } = await getExchangeRate();
    let updated = 0;
    let failed = 0;
    const errors: Array<{ stock_code: string; error: string }> = [];

    // Process stocks sequentially
    for (const stock of manualStocks) {
      try {
        const currency = (stock as { currency?: string }).currency ?? "KRW";
        const market = marketMap.get(stock.stock_code);

        const result = await fetchStockPrice(stock.stock_code, { currency, market });

        const { error: updateError } = await supabase
          .from("manual_stocks")
          .update({
            current_price: result.price,
            price_updated_at: result.marketTime ?? new Date().toISOString(),
          } as never)
          .eq("id", stock.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        updated++;
      } catch (err) {
        failed++;
        errors.push({
          stock_code: stock.stock_code,
          error: err instanceof Error ? err.message : "알 수 없는 오류",
        });
      }
    }

    return NextResponse.json({
      updated,
      failed,
      errors,
      exchange_rate: exchangeRate,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "가격 업데이트 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
