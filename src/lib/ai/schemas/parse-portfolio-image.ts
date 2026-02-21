import { z } from "zod/v4";

/**
 * 이미지 포트폴리오 파싱 결과 스키마
 * OpenAI Structured Outputs (strict mode) 호환
 * avg_price/total_amount 중 하나만 있을 수 있으므로 둘 다 포함
 */
const RawParsedStockSchema = z.object({
  stock_name: z.string(),
  stock_code: z.string().nullable(),
  quantity: z.number(),
  avg_price: z.number(),
  total_amount: z.number(),
  currency: z.enum(["KRW", "USD"]),
});

export const ParsePortfolioImageSchema = z.object({
  stocks: z.array(RawParsedStockSchema),
});

export type RawParsedStock = z.infer<typeof RawParsedStockSchema>;
export type ParsePortfolioImageResult = z.infer<
  typeof ParsePortfolioImageSchema
>;
