import { KIWOOM_BASE_URL, ENDPOINTS } from "./constants";
import { KiwoomApiError } from "./errors";
import type { KiwoomTokenResponse } from "./types";

interface TokenCache {
  access_token: string;
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

export async function refreshToken(): Promise<string> {
  const { appKey, appSecret } = getCredentials();

  const response = await fetch(`${KIWOOM_BASE_URL}${ENDPOINTS.TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      app_key: appKey,
      app_secret: appSecret,
    }),
  });

  if (!response.ok) {
    throw new KiwoomApiError(
      "AUTH_FAILED",
      `토큰 발급 실패: ${response.status} ${response.statusText}`,
      response.status
    );
  }

  const data: KiwoomTokenResponse = await response.json();

  tokenCache = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

export function isTokenExpired(): boolean {
  if (!tokenCache) return true;
  return Date.now() >= tokenCache.expires_at - TOKEN_REFRESH_MARGIN_MS;
}

export async function getAccessToken(): Promise<string> {
  if (!isTokenExpired() && tokenCache) {
    return tokenCache.access_token;
  }
  return refreshToken();
}

export function clearTokenCache(): void {
  tokenCache = null;
}
