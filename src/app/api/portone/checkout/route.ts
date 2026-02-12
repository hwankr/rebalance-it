import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/subscription/guard";

// TODO: PortOne 빌링키 발급 처리 구현
// - 클라이언트에서 PortOne 결제창으로 빌링키 발급 후 billingKey를 전달받음
// - billingKey를 subscriptions 테이블에 저장
// - 첫 결제 실행
export async function POST() {
  try {
    await requireAuth();
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  return NextResponse.json(
    { message: "결제 기능 준비 중" },
    { status: 501 }
  );
}
