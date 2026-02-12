import { NextRequest, NextResponse } from "next/server";
import { getStockChart } from "@/lib/kiwoom/client";
import { KiwoomApiError } from "@/lib/kiwoom/errors";
import { requirePlan } from "@/lib/subscription/guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await requirePlan("pro");
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  const { code } = await params;

  if (!code) {
    return NextResponse.json(
      { error: "종목 코드가 필요합니다." },
      { status: 400 }
    );
  }

  const { searchParams } = request.nextUrl;
  const period = (searchParams.get("period") ?? "day") as
    | "day"
    | "week"
    | "month";
  const count = Number(searchParams.get("count") ?? "60");

  if (!["day", "week", "month"].includes(period)) {
    return NextResponse.json(
      { error: "period는 day, week, month 중 하나여야 합니다." },
      { status: 400 }
    );
  }

  if (isNaN(count) || count < 1 || count > 300) {
    return NextResponse.json(
      { error: "count는 1~300 사이의 숫자여야 합니다." },
      { status: 400 }
    );
  }

  try {
    const chartData = await getStockChart(code, period, count);
    return NextResponse.json(chartData);
  } catch (error) {
    if (error instanceof KiwoomApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 500 }
      );
    }
    return NextResponse.json(
      { error: "차트 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
