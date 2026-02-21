import { z } from "zod/v4";

/**
 * 텍스트 포트폴리오 파싱 결과 스키마
 * OpenAI Structured Outputs (strict mode) 호환
 */
const ParsedStockSchema = z.object({
  stock_name: z.string(),
  stock_code: z.string().nullable(),
  quantity: z.number(),
  avg_price: z.number(),
  currency: z.enum(["KRW", "USD"]),
});

export const ParsePortfolioSchema = z.object({
  stocks: z.array(ParsedStockSchema),
});

export type ParsedStock = z.infer<typeof ParsedStockSchema>;
export type ParsePortfolioResult = z.infer<typeof ParsePortfolioSchema>;
