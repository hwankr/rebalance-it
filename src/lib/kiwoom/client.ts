import { getAccessToken } from "./auth";
import { KIWOOM_BASE_URL, ENDPOINTS, RATE_LIMIT } from "./constants";
import { KiwoomApiError, getErrorMessage } from "./errors";
import type {
  KiwoomBalanceResponse,
  KiwoomChartResponse,
  KiwoomOrderRequest,
  KiwoomOrderResponse,
  KiwoomStockInfo,
  KiwoomErrorResponse,
} from "./types";

let lastCallTime = 0;

async function rateLimitDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < RATE_LIMIT.MIN_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT.MIN_INTERVAL_MS - elapsed)
    );
  }
  lastCallTime = Date.now();
}

async function kiwoomFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = RATE_LIMIT.MAX_RETRIES
): Promise<T> {
  await rateLimitDelay();

  const token = await getAccessToken();

  const response = await fetch(`${KIWOOM_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 429 && retries > 0) {
    const backoff =
      RATE_LIMIT.BACKOFF_BASE_MS *
      Math.pow(2, RATE_LIMIT.MAX_RETRIES - retries);
    await new Promise((resolve) => setTimeout(resolve, backoff));
    return kiwoomFetch<T>(endpoint, options, retries - 1);
  }

  if (!response.ok) {
    let errorData: KiwoomErrorResponse | undefined;
    try {
      errorData = await response.json();
    } catch {
      // JSON 파싱 실패 시 무시
    }

    const code = errorData?.error_code || "UNKNOWN";
    const message = errorData?.error_message || getErrorMessage(code);

    throw new KiwoomApiError(code, message, response.status);
  }

  return response.json();
}

// === 계좌 API ===

export async function getBalance(
  account: string
): Promise<KiwoomBalanceResponse> {
  return kiwoomFetch<KiwoomBalanceResponse>(
    `${ENDPOINTS.BALANCE}?account=${encodeURIComponent(account)}`
  );
}

export async function getDeposits(
  account: string
): Promise<{ deposit: number; available: number }> {
  return kiwoomFetch(
    `${ENDPOINTS.DEPOSITS}?account=${encodeURIComponent(account)}`
  );
}

// === 종목 API ===

export async function getStockInfo(
  stockCode: string
): Promise<KiwoomStockInfo> {
  return kiwoomFetch<KiwoomStockInfo>(
    `${ENDPOINTS.STOCK_INFO}?code=${encodeURIComponent(stockCode)}`
  );
}

// === 주문 API ===

export async function placeOrder(
  order: KiwoomOrderRequest
): Promise<KiwoomOrderResponse> {
  return kiwoomFetch<KiwoomOrderResponse>(ENDPOINTS.ORDER, {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export async function cancelOrder(
  orderId: string,
  account: string
): Promise<{ success: boolean; message: string }> {
  return kiwoomFetch(
    `${ENDPOINTS.ORDER}?order_id=${encodeURIComponent(orderId)}&account=${encodeURIComponent(account)}`,
    { method: "DELETE" }
  );
}

// === 차트 API ===

export async function getStockChart(
  stockCode: string,
  period: "day" | "week" | "month" = "day",
  count: number = 60
): Promise<KiwoomChartResponse> {
  return kiwoomFetch<KiwoomChartResponse>(
    `${ENDPOINTS.CHART}?code=${encodeURIComponent(stockCode)}&period=${period}&count=${count}`
  );
}
