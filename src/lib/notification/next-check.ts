/** cooldown_days 기반으로 다음 체크 시각 계산 */
export function calculateNextCheckAt(cooldownDays: number): Date {
  const next = new Date();
  next.setDate(next.getDate() + cooldownDays);
  return next;
}

/** 리포트 주기 설정에 따른 다음 발송 시각 계산 (모든 연산 UTC 기준) */
export function calculateNextReportAt(params: {
  intervalType: "weekly" | "biweekly" | "monthly" | "custom";
  dayOfWeek?: number | null; // 0=일, 1=월, ..., 6=토
  dayOfMonth?: number | null; // 1-28
  customDays?: number | null; // 7-90
  fromDate?: Date; // 기준일 (기본: now)
}): Date {
  const { intervalType, dayOfWeek, dayOfMonth, customDays, fromDate } = params;
  const from = fromDate ? new Date(fromDate) : new Date();

  switch (intervalType) {
    case "weekly": {
      const targetDay = dayOfWeek ?? 1; // 기본: 월요일
      const next = new Date(from);
      const currentDay = next.getUTCDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) daysUntilTarget += 7;
      next.setUTCDate(next.getUTCDate() + daysUntilTarget);
      next.setUTCHours(22, 0, 0, 0);
      return next;
    }

    case "biweekly": {
      const targetDay = dayOfWeek ?? 1; // 기본: 월요일
      const next = new Date(from);
      const currentDay = next.getUTCDay();
      // 다음 주 목표 요일까지의 일수
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) daysUntilTarget += 7;
      // 2주 후 = 다음 목표 요일 + 7일
      next.setUTCDate(next.getUTCDate() + daysUntilTarget + 7);
      next.setUTCHours(22, 0, 0, 0);
      return next;
    }

    case "monthly": {
      const targetDom = dayOfMonth ?? 1; // 기본: 1일
      const next = new Date(from);
      // 현재 월에서 targetDom이 이미 지났거나 오늘이면 다음 달
      if (next.getUTCDate() > targetDom) {
        next.setUTCMonth(next.getUTCMonth() + 1);
      } else if (next.getUTCDate() === targetDom && next.getUTCHours() >= 22) {
        // 당일이지만 CRON 시간(22시) 이후면 다음 달
        next.setUTCMonth(next.getUTCMonth() + 1);
      }
      next.setUTCDate(targetDom);
      next.setUTCHours(22, 0, 0, 0);
      return next;
    }

    case "custom": {
      const days = customDays ?? 30; // 기본: 30일
      const next = new Date(from);
      next.setUTCDate(next.getUTCDate() + days);
      next.setUTCHours(22, 0, 0, 0);
      return next;
    }

    default:
      // fallback: 다음 달 1일
      const fallback = new Date(from);
      fallback.setUTCMonth(fallback.getUTCMonth() + 1);
      fallback.setUTCDate(1);
      fallback.setUTCHours(22, 0, 0, 0);
      return fallback;
  }
}

/** 리포트 주기를 한국어 레이블로 변환 */
export function getReportIntervalLabel(params: {
  intervalType: "weekly" | "biweekly" | "monthly" | "custom";
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  customDays?: number | null;
}): string {
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  switch (params.intervalType) {
    case "weekly": {
      const dayName = dayNames[params.dayOfWeek ?? 1];
      return `매주 ${dayName}요일`;
    }
    case "biweekly": {
      const dayName = dayNames[params.dayOfWeek ?? 1];
      return `격주 ${dayName}요일`;
    }
    case "monthly": {
      const dom = params.dayOfMonth ?? 1;
      return `매월 ${dom}일`;
    }
    case "custom": {
      const days = params.customDays ?? 30;
      return `${days}일마다`;
    }
    default:
      return "매월 1일";
  }
}
