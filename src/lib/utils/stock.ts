/** 종목코드와 통화에서 Yahoo Finance 시장 코드를 추정합니다. */
export function detectMarket(
  stockCode: string,
  currency?: string,
): string | undefined {
  if (currency === "KRW" || /^\d{6}$/.test(stockCode)) return "KOSPI";
  return undefined;
}
