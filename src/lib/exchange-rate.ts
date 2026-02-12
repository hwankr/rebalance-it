let cachedRate: { rate: number; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getExchangeRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL) {
    return cachedRate.rate;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    const rate = data.rates?.KRW ?? 1350;
    cachedRate = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return cachedRate?.rate ?? 1350;
  }
}
