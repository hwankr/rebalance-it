import { NextResponse } from "next/server";
import { refreshToken, getAccessToken, isTokenExpired } from "@/lib/kiwoom/auth";
import { KiwoomApiError } from "@/lib/kiwoom/errors";

export async function POST() {
  try {
    const token = await refreshToken();
    return NextResponse.json({ success: true, token_preview: `${token.slice(0, 8)}...` });
  } catch (error) {
    if (error instanceof KiwoomApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 500 }
      );
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("토큰 발급 오류:", message);
    return NextResponse.json(
      { error: `토큰 발급 실패: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const expired = isTokenExpired();
    if (expired) {
      return NextResponse.json({ authenticated: false, message: "토큰이 만료되었거나 발급되지 않았습니다." });
    }
    const token = await getAccessToken();
    return NextResponse.json({
      authenticated: true,
      token_preview: `${token.slice(0, 8)}...`,
    });
  } catch (error) {
    if (error instanceof KiwoomApiError) {
      return NextResponse.json(
        { authenticated: false, error: error.message },
        { status: error.status ?? 500 }
      );
    }
    return NextResponse.json(
      { authenticated: false, error: "토큰 상태 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
