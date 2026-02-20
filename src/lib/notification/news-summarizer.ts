/**
 * AI 뉴스 요약 유틸리티
 * OpenAI gpt-4o-mini를 사용하여 종목별 뉴스를 한국어 브리핑으로 요약
 */

import type { StockNewsItem } from "@/lib/stock-news";

interface StockInfo {
  stock_code: string;
  stock_name: string;
  currency: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string | null;
}

export interface StockNewsSummary {
  stockName: string;
  stockCode: string;
  summary: string;
  newsCount: number;
  articles: NewsArticle[];
}

/**
 * 종목별 뉴스를 AI로 요약하여 브리핑 생성
 * 실패 시 원문 제목 목록으로 폴백
 */
export async function summarizeStockNews(
  stocks: StockInfo[],
  newsMap: Map<string, StockNewsItem[]>,
): Promise<StockNewsSummary[]> {
  const results: StockNewsSummary[] = [];

  for (const stock of stocks) {
    const news = newsMap.get(stock.stock_code);
    if (!news || news.length === 0) continue;

    const summary = await summarizeSingleStock(stock, news);
    results.push(summary);
  }

  return results;
}

async function summarizeSingleStock(
  stock: StockInfo,
  news: StockNewsItem[],
): Promise<StockNewsSummary> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackSummary(stock, news);
  }

  const newsContent = news
    .map((n, i) => {
      let line = `${i + 1}. [${n.source}] ${n.title}`;
      if (n.summary) line += `\n   요약: ${n.summary}`;
      return line;
    })
    .join("\n");

  const articles: NewsArticle[] = news.slice(0, 5).map((n) => ({
    title: n.title,
    url: n.url,
    source: n.source,
    publishedAt: n.publishedAt,
    summary: n.summary?.slice(0, 150) ?? null,
  }));

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "당신은 주식 뉴스를 분석하는 금융 애널리스트입니다. 투자자에게 도움이 되는 한국어 브리핑을 작성합니다.\n\n규칙:\n- 각 뉴스의 핵심 내용을 종합하여 자연스러운 문장으로 요약하세요.\n- 정보의 출처를 본문에 (출처명) 형태로 자연스럽게 포함하세요.\n- 구체적인 수치, 금액, 날짜 등 팩트를 가능한 포함하세요.\n- 분량 제한 없이 중요한 내용을 빠짐없이 전달하세요.",
          },
          {
            role: "user",
            content: `종목: ${stock.stock_name} (${stock.stock_code})\n\n최근 뉴스:\n${newsContent}\n\n위 뉴스들을 종합하여 이 종목의 이번 주 동향을 요약해주세요. 각 정보의 출처를 (출처명) 형태로 본문에 포함해주세요.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`[news-summarizer] OpenAI API 오류: ${res.status}`);
      return fallbackSummary(stock, news);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return fallbackSummary(stock, news);
    }

    return {
      stockName: stock.stock_name,
      stockCode: stock.stock_code,
      summary: content,
      newsCount: news.length,
      articles,
    };
  } catch (err) {
    console.error(`[news-summarizer] AI 요약 실패 (${stock.stock_code}):`, err);
    return fallbackSummary(stock, news);
  }
}

function fallbackSummary(
  stock: StockInfo,
  news: StockNewsItem[],
): StockNewsSummary {
  const titles = news
    .slice(0, 3)
    .map((n) => `• ${n.title}`)
    .join("\n");

  const articles: NewsArticle[] = news.slice(0, 5).map((n) => ({
    title: n.title,
    url: n.url,
    source: n.source,
    publishedAt: n.publishedAt,
    summary: n.summary?.slice(0, 150) ?? null,
  }));

  return {
    stockName: stock.stock_name,
    stockCode: stock.stock_code,
    summary: titles,
    newsCount: news.length,
    articles,
  };
}
