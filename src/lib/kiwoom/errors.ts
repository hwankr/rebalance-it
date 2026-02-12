export class KiwoomApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "KiwoomApiError";
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_001: "인증 토큰이 만료되었습니다. 재발급이 필요합니다.",
  AUTH_002: "유효하지 않은 App Key입니다.",
  AUTH_003: "허용되지 않은 IP에서의 접근입니다.",
  ORDER_001: "주문 수량이 올바르지 않습니다.",
  ORDER_002: "주문 가격이 호가 단위에 맞지 않습니다.",
  ORDER_003: "잔고가 부족합니다.",
  ORDER_004: "거래시간이 아닙니다.",
  RATE_001: "API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
  UNKNOWN: "알 수 없는 오류가 발생했습니다.",
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN;
}

export function isKiwoomError(error: unknown): error is KiwoomApiError {
  return error instanceof KiwoomApiError;
}
