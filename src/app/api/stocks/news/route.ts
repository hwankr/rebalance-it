import { NextRequest, NextResponse } from "next/server";
import { fetchNaverResearch, fetchNaverNews } from "@/lib/stock-news";

export { type StockNewsItem } from "@/lib/stock-news";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const market = searchParams.get("market") ?? undefined;
  const name = searchParams.get("name") ?? undefined;

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const isKorean = market === "KOSPI" || market === "KOSDAQ" || /^\d{6}$/.test(code);
    const news = isKorean
      ? await fetchNaverResearch(code)
      : await fetchNaverNews(code, name);
    return NextResponse.json({
      items: news,
      fetchedAt: new Date().toISOString(),
      provider: "네이버 금융",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "뉴스 조회 실패" },
      { status: 500 },
    );
  }
}
