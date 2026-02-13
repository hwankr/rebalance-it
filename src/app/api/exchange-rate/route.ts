import { NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/exchange-rate";

export async function GET() {
  try {
    const { rate, fetchedAt } = await getExchangeRate();
    return NextResponse.json(
      {
        rate,
        from: "USD",
        to: "KRW",
        updated_at: fetchedAt > 0 ? new Date(fetchedAt).toISOString() : null,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "환율 정보를 가져올 수 없습니다." },
      { status: 500 }
    );
  }
}
