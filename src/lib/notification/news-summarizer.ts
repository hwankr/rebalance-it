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

export interface StockNewsSummary {
  stockName: string;
  stockCode: string;
  summary: string;
  newsCount: number;
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

  const newsTitles = news
    .map((n, i) => `${i + 1}. [${n.source}] ${n.title}`)
    .join("\n");

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
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "당신은 주식 뉴스를 분석하는 금융 애널리스트입니다. 투자자에게 도움이 되는 간결한 한국어 브리핑을 작성합니다. 2~3문장으로 핵심 내용을 요약하세요.",
          },
          {
            role: "user",
            content: `종목: ${stock.stock_name} (${stock.stock_code})\n\n최근 뉴스 제목:\n${newsTitles}\n\n위 뉴스들을 종합하여 이 종목의 최근 동향을 2~3문장으로 요약해주세요.`,
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

  return {
    stockName: stock.stock_name,
    stockCode: stock.stock_code,
    summary: titles,
    newsCount: news.length,
  };
}
