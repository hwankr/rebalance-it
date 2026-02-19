/** cooldown_days 기반으로 다음 체크 시각 계산 */
export function calculateNextCheckAt(cooldownDays: number): Date {
  const next = new Date();
  next.setDate(next.getDate() + cooldownDays);
  return next;
}
