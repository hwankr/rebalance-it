/** 기본 환율 (USD/KRW) 폴백 */
export const DEFAULT_EXCHANGE_RATE = 1350;

/** 통화 형식 포맷 (예: "1,234,567원") */
export function formatCurrency(amount: number): string {
  return `${(amount ?? 0).toLocaleString("ko-KR")}원`;
}

/** USD 가격 포맷 (예: "$150.25") */
export function formatUsdPrice(price: number): string {
  if (!Number.isFinite(price)) return "$0.00";
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** 통화 인식 현재가 포맷터 */
export function formatStockPrice(stock: {
  currency?: string;
  native_price?: number;
  current_price: number;
}): string {
  if (stock.currency === "USD" && stock.native_price != null) {
    return formatUsdPrice(stock.native_price);
  }
  return formatCurrency(stock.current_price);
}

/** 통화 인식 평균단가 포맷터 */
export function formatAvgPrice(stock: {
  currency?: string;
  native_avg_price?: number;
  avg_price: number;
}): string {
  if (stock.currency === "USD" && stock.native_avg_price != null) {
    return formatUsdPrice(stock.native_avg_price);
  }
  return formatCurrency(stock.avg_price);
}

/** 퍼센트 형식 포맷 (예: "12.34%") */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value ?? 0).toFixed(decimals)}%`;
}

/** 종목 코드 포맷 (6자리 0-padding) */
export function formatStockCode(code: string): string {
  return code.padStart(6, "0");
}

/** 변동 값 포맷 (예: "+1,200" 또는 "-500") */
export function formatChange(change: number): string {
  const formatted = Math.abs(change).toLocaleString("ko-KR");
  if (change > 0) return `+${formatted}`;
  if (change < 0) return `-${formatted}`;
  return "0";
}
