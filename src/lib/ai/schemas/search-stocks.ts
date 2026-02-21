import { z } from "zod/v4";

/**
 * 자연어 주식 검색 쿼리 파싱 결과 스키마
 * OpenAI Structured Outputs (strict mode) 호환
 */
export const SearchStocksSchema = z.object({
  keywords: z.array(z.string()),
  keywords_ko: z.array(z.string()),
  keywords_en: z.array(z.string()),
  market: z
    .enum(["US", "KR", "KOSPI", "KOSDAQ", "NYSE", "NASDAQ"])
    .nullable(),
  asset_type: z.enum(["STOCK", "ETF"]).nullable(),
});

export type SearchStocksResult = z.infer<typeof SearchStocksSchema>;
