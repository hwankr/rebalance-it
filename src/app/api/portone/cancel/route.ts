import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/subscription/guard";

// TODO: 구독 취소 처리 구현
// - 사용자 인증 확인
// - subscriptions 테이블에서 cancel_at_period_end = true 설정
// - PortOne 빌링키 삭제 또는 다음 결제 예약 취소
// - 현재 기간 만료까지는 Pro 기능 유지
export async function POST() {
  try {
    await requireAuth();
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "인증 오류" }, { status: 500 });
  }

  return NextResponse.json(
    { message: "구독 취소 기능 준비 중" },
    { status: 501 }
  );
}
