// KRX 호가 단위 테이블
const TICK_SIZE_TABLE = [
  { max: 2_000, tick: 1 },
  { max: 5_000, tick: 5 },
  { max: 20_000, tick: 10 },
  { max: 50_000, tick: 50 },
  { max: 200_000, tick: 100 },
  { max: 500_000, tick: 500 },
  { max: Infinity, tick: 1_000 },
] as const;

/** 가격대별 호가 단위 반환 */
export function getTickSize(price: number): number {
  const entry = TICK_SIZE_TABLE.find((e) => price < e.max);
  return entry?.tick ?? 1_000;
}

/** 가격을 호가 단위로 내림 처리 */
export function adjustToTickSize(price: number): number {
  const tick = getTickSize(price);
  return Math.floor(price / tick) * tick;
}

/** 가격을 호가 단위로 올림 처리 */
export function adjustToTickSizeCeil(price: number): number {
  const tick = getTickSize(price);
  return Math.ceil(price / tick) * tick;
}
