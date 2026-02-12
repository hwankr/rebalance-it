import { NextRequest, NextResponse } from "next/server";
import { getBalance } from "@/lib/kiwoom/client";
import { KiwoomApiError } from "@/lib/kiwoom/errors";

export async function GET(request: NextRequest) {
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
    if (error instanceof KiwoomApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 500 }
      );
    }
    return NextResponse.json(
      { error: "잔고 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
