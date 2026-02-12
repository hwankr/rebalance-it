import { NextRequest, NextResponse } from "next/server";
import { getBalance } from "@/lib/kiwoom/client";
import { KiwoomApiError } from "@/lib/kiwoom/errors";
import { requirePlan } from "@/lib/subscription/guard";

export async function GET(request: NextRequest) {
  try {
    await requirePlan("pro");
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  const account = request.nextUrl.searchParams.get("account");

  if (!account) {
    return NextResponse.json(
      { error: "account 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const balance = await getBalance(account);
    return NextResponse.json(balance);
  } catch (error) {
    console.error("잔고 조회 에러 전체:", error);
    if (error instanceof KiwoomApiError) {
      console.error("KiwoomApiError:", error.code, error.message, error.status);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 500 }
      );
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `잔고 조회 실패: ${message}` },
      { status: 500 }
    );
  }
}
