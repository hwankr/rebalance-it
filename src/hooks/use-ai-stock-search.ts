"use client";

import { useQuery } from "@tanstack/react-query";
import type { StockItem } from "./use-stock-list";

interface AISearchFilters {
  keywords: string[];
  keywords_ko: string[];
  keywords_en: string[];
  market: string | null;
  asset_type: string | null;
}

interface AISearchResponse {
  results: StockItem[];
  filters: AISearchFilters;
}

async function fetchAISearch(query: string): Promise<AISearchResponse> {
  const res = await fetch("/api/ai/search-stocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `AI 검색 실패 (${res.status})`);
  }

  return res.json();
}

/**
 * 자연어 쿼리가 AI 검색이 필요한지 판단합니다.
 * 종목코드/종목명 직접 검색과 구분하기 위해 사용합니다.
 */
export function isNaturalLanguageQuery(query: string): boolean {
  const q = query.trim();
  if (q.length < 4) return false;

  // 종목코드 패턴 (숫자 6자리 또는 영문 대문자 1-5자리)
  if (/^\d{6}$/.test(q)) return false;
  if (/^[A-Z]{1,5}$/.test(q)) return false;

  // 자연어 키워드 패턴
  const nlPatterns = [
    /관련/, /높은/, /낮은/, /좋은/,
    /ETF/, /배당/, /성장/, /가치/,
    /섹터/, /산업/, /업종/,
    /미국/, /한국/, /해외/, /국내/,
    /대형/, /중형/, /소형/,
    /tech/, /growth/, /value/, /dividend/i,
  ];

  return nlPatterns.some((p) => p.test(q));
}

export function useAIStockSearch(query: string, enabled: boolean = true) {
  const isNL = isNaturalLanguageQuery(query);

  const { data, isLoading, error } = useQuery<AISearchResponse>({
    queryKey: ["ai-stock-search", query],
    queryFn: () => fetchAISearch(query),
    enabled: enabled && isNL && query.trim().length >= 4,
    staleTime: 5 * 60 * 1000, // 5분 캐시
    retry: 1,
  });

  return {
    results: data?.results ?? [],
    filters: data?.filters ?? null,
    isLoading,
    isNaturalLanguage: isNL,
    error,
  };
}
