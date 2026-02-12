/** 통화 형식 포맷 (예: "1,234,567원") */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

/** 퍼센트 형식 포맷 (예: "12.34%") */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
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
