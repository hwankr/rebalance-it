import { getAccessToken, getAuthHeaders } from "./auth";
import { ENDPOINTS, API_IDS, RATE_LIMIT, getKiwoomUrl, getProxyHeaders } from "./constants";
import { KiwoomApiError, getErrorMessage } from "./errors";
import type {
  KiwoomBalanceResponse,
  KiwoomChartResponse,
  KiwoomOrderRequest,
  KiwoomOrderResponse,
  KiwoomStock,
  KiwoomStockInfo,
} from "./types";

let lastCallTime = 0;

/** 응답의 키/shape만 안전하게 로깅 (값은 민감정보라 제외) */
function logResponseShape(label: string, endpoint: string, apiId: string, data: unknown) {
  if (!data || typeof data !== "object") {
    console.log(label, endpoint, apiId, "type:", typeof data);
    return;
  }
  const topKeys = Object.keys(data as Record<string, unknown>);
  const shapes: Record<string, string> = {};
  for (const key of topKeys) {
    const val = (data as Record<string, unknown>)[key];
    if (Array.isArray(val)) {
      const first = val[0];
      shapes[key] = `array[${val.length}]` + (first && typeof first === "object" ? ` keys:${Object.keys(first).join(",")}` : "");
    } else {
      shapes[key] = typeof val === "object" && val !== null ? `object keys:${Object.keys(val).join(",")}` : typeof val;
    }
  }
  console.log(label, endpoint, apiId, JSON.stringify(shapes, null, 2));
}

/** 숫자 파싱 헬퍼: 문자열/숫자/콤마 숫자 등을 안전하게 number로 변환 */
function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "");
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/** kt00004 raw 응답 → KiwoomBalanceResponse 어댑터 */
function mapEvaluationResponse(raw: unknown): KiwoomBalanceResponse {
  if (!raw || typeof raw !== "object") {
    return { cash: 0, total_value: 0, total_profit_loss: 0, total_profit_rate: 0, stocks: [] };
  }

  const r = raw as Record<string, unknown>;

  // 키움 응답은 output1(요약), output2(종목리스트) 패턴이 흔함
  // 또는 flat 구조일 수도 있으므로 둘 다 탐색
  const summary = (r.output1 ?? r.summary ?? r) as Record<string, unknown>;
  const stockList = (r.output2 ?? r.stocks ?? r.items ?? []) as unknown[];

  const stocks: KiwoomStock[] = Array.isArray(stockList)
    ? stockList.map((item) => {
        const s = item as Record<string, unknown>;
        return {
          stock_code: String(s.stk_cd ?? s.stock_code ?? s.iscd ?? ""),
          stock_name: String(s.stk_nm ?? s.stock_name ?? s.prdt_name ?? ""),
          quantity: parseNum(s.qty ?? s.hldg_qty ?? s.quantity ?? 0),
          avg_price: parseNum(s.avg_uv ?? s.pchs_avg_pric ?? s.avg_price ?? 0),
          current_price: parseNum(s.cur_uv ?? s.prpr ?? s.current_price ?? 0),
          eval_amount: parseNum(s.evl_amt ?? s.eval_amount ?? 0),
          profit_loss: parseNum(s.pft_ls ?? s.evl_pfls_amt ?? s.profit_loss ?? 0),
          profit_rate: parseNum(s.pft_rt ?? s.evl_pfls_rt ?? s.profit_rate ?? 0),
        };
      })
    : [];

  return {
    cash: parseNum(summary.dpst ?? summary.cash ?? summary.dnca_tot_amt ?? 0),
    total_value: parseNum(summary.tot_evl_amt ?? summary.total_value ?? summary.tot_asst_amt ?? 0),
    total_profit_loss: parseNum(summary.tot_pft_ls ?? summary.total_profit_loss ?? summary.tot_evl_pfls_amt ?? 0),
    total_profit_rate: parseNum(summary.tot_pft_rt ?? summary.total_profit_rate ?? 0),
    stocks,
  };
}

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

/**
 * 키움 REST API 공통 호출 함수
 * - 모든 요청은 POST
 * - api-id 헤더로 TR 구분
 * - appkey, appsecret 헤더 필수
 */
async function kiwoomFetch<T>(
  endpoint: string,
  apiId: string,
  body: Record<string, unknown> = {},
  retries: number = RATE_LIMIT.MAX_RETRIES
): Promise<T> {
  await rateLimitDelay();

  const token = await getAccessToken();

  const response = await fetch(getKiwoomUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      authorization: `Bearer ${token}`,
      "api-id": apiId,
      ...getAuthHeaders(),
      ...getProxyHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (response.status === 429 && retries > 0) {
    const backoff =
      RATE_LIMIT.BACKOFF_BASE_MS *
      Math.pow(2, RATE_LIMIT.MAX_RETRIES - retries);
    await new Promise((resolve) => setTimeout(resolve, backoff));
    return kiwoomFetch<T>(endpoint, apiId, body, retries - 1);
  }

  if (!response.ok) {
    let errorData: Record<string, unknown> | undefined;
    try {
      errorData = await response.json();
    } catch {
      // JSON 파싱 실패 시 무시
    }

    console.error("키움 API 에러 응답:", endpoint, apiId, response.status, errorData);

    const code =
      (errorData?.error_code as string) ??
      (errorData?.return_code != null ? String(errorData.return_code) : "UNKNOWN");
    const message =
      (errorData?.error_message as string) ??
      (errorData?.return_msg as string) ??
      (errorData?.message as string) ??
      getErrorMessage(code);

    throw new KiwoomApiError(code, message, response.status);
  }

  const data = await response.json();
  // 디스커버리: 키/shape만 로깅 (값은 민감정보)
  logResponseShape("키움 API 응답", endpoint, apiId, data);
  return data;
}

// === 계좌 API ===

/** 계좌평가현황요청 (kt00004) */
export async function getBalance(
  account: string
): Promise<KiwoomBalanceResponse> {
  const raw = await kiwoomFetch<unknown>(
    ENDPOINTS.ACCOUNT,
    API_IDS.EVALUATION,
    { qry_tp: "0", dmst_stex_tp: "00" }
  );
  return mapEvaluationResponse(raw);
}

/** 예수금상세현황요청 (kt00001) */
export async function getDeposits(
  account: string
): Promise<{ deposit: number; available: number }> {
  return kiwoomFetch(
    ENDPOINTS.ACCOUNT,
    API_IDS.DEPOSITS,
    { qry_tp: "0" }
  );
}

// === 종목 API ===

export async function getStockInfo(
  stockCode: string
): Promise<KiwoomStockInfo> {
  return kiwoomFetch<KiwoomStockInfo>(
    ENDPOINTS.STOCK_INFO,
    API_IDS.STOCK_INFO,
    { stk_cd: stockCode }
  );
}

// === 주문 API ===

export async function placeOrder(
  order: KiwoomOrderRequest
): Promise<KiwoomOrderResponse> {
  const apiId = order.side === "buy" ? API_IDS.BUY : API_IDS.SELL;

  // trde_tp: "00" = 지정가, "03" = 시장가
  const trdeType = order.order_type === "market" ? "03" : "00";

  return kiwoomFetch<KiwoomOrderResponse>(ENDPOINTS.ORDER, apiId, {
    dmst_stex_tp: "01",
    stk_cd: order.symbol,
    ord_qty: order.qty,
    trde_tp: trdeType,
    ord_uv: order.price ?? 0,
  });
}

export async function cancelOrder(
  orderId: string,
  account: string
): Promise<{ success: boolean; message: string }> {
  return kiwoomFetch(ENDPOINTS.ORDER, API_IDS.CANCEL, {
    dmst_stex_tp: "01",
    orig_ord_no: orderId,
    stk_cd: "",
    cncl_qty: 0,
  });
}

// === 차트 API ===

export async function getStockChart(
  stockCode: string,
  period: "day" | "week" | "month" = "day",
  count: number = 60
): Promise<KiwoomChartResponse> {
  return kiwoomFetch<KiwoomChartResponse>(
    ENDPOINTS.CHART,
    API_IDS.CHART_DAY_WEEK_MONTH,
    { stk_cd: stockCode, base_dt: "", updn_tp: "0" }
  );
}
