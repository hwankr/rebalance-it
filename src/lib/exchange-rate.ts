let cachedRate: { rate: number; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getExchangeRate(): Promise<{
  rate: number;
  fetchedAt: number;
}> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL) {
    return { rate: cachedRate.rate, fetchedAt: cachedRate.fetchedAt };
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    const rate = data.rates?.KRW ?? 1350;
    const fetchedAt = Date.now();
    cachedRate = { rate, fetchedAt };
    return { rate, fetchedAt };
  } catch {
    if (cachedRate) {
      return { rate: cachedRate.rate, fetchedAt: cachedRate.fetchedAt };
    }
    return { rate: 1350, fetchedAt: 0 };
  }
}
