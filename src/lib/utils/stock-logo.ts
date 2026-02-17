const AVATAR_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#14B8A6", // teal
  "#6366F1", // indigo
  "#84CC16", // lime
  "#A855F7", // purple
] as const;

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getStockColor(stockCode: string): string {
  return AVATAR_COLORS[hashCode(stockCode) % AVATAR_COLORS.length];
}

export function getStockInitials(
  stockName: string,
  stockCode: string,
  currency?: string
): string {
  if (currency === "USD") {
    return stockCode.slice(0, 2).toUpperCase();
  }
  return stockName.charAt(0);
}
