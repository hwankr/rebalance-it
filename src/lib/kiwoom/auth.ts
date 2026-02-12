import { ENDPOINTS, getKiwoomUrl, getProxyHeaders } from "./constants";
import { KiwoomApiError } from "./errors";

interface TokenCache {
  token: string;
  expires_at: number; // Unix timestamp (ms)
}

let tokenCache: TokenCache | null = null;

const TOKEN_REFRESH_MARGIN_MS = 60 * 60 * 1000; // 만료 1시간 전에 갱신

function getCredentials() {
  const appKey = process.env.KIWOOM_APP_KEY;
  const appSecret = process.env.KIWOOM_APP_SECRET;

  if (!appKey || !appSecret) {
    throw new KiwoomApiError(
      "AUTH_CONFIG",
      "KIWOOM_APP_KEY 또는 KIWOOM_APP_SECRET이 설정되지 않았습니다."
    );
  }

  return { appKey, appSecret };
}

export function getAuthHeaders(): Record<string, string> {
  const { appKey, appSecret } = getCredentials();
  return {
    appkey: appKey,
    appsecret: appSecret,
  };
}

export async function refreshToken(): Promise<string> {
  const { appKey, appSecret } = getCredentials();

  const response = await fetch(getKiwoomUrl(ENDPOINTS.TOKEN), {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      ...getProxyHeaders(),
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: appKey,
      secretkey: appSecret,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData?.return_msg ?? errorData?.message ?? `${response.status} ${response.statusText}`;
    throw new KiwoomApiError("AUTH_FAILED", `토큰 발급 실패: ${message}`, response.status);
  }

  const data = await response.json();
  console.log("키움 토큰 응답:", JSON.stringify(data, null, 2));

  const token = data.token ?? data.access_token;
  if (!token) {
    throw new KiwoomApiError(
      "AUTH_PARSE",
      `토큰 응답에서 token을 찾을 수 없습니다. 응답 키: ${Object.keys(data).join(", ")}`
    );
  }

  // expires_dt가 있으면 파싱, 없으면 24시간 기본값
  let expiresAt: number;
  if (data.expires_dt) {
    expiresAt = new Date(data.expires_dt).getTime();
  } else {
    expiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;
  }

  tokenCache = { token, expires_at: expiresAt };

  return token;
}

export function isTokenExpired(): boolean {
  if (!tokenCache) return true;
  return Date.now() >= tokenCache.expires_at - TOKEN_REFRESH_MARGIN_MS;
}

export async function getAccessToken(): Promise<string> {
  if (!isTokenExpired() && tokenCache) {
    return tokenCache.token;
  }
  return refreshToken();
}

export function clearTokenCache(): void {
  tokenCache = null;
}
