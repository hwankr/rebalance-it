import { NextRequest, NextResponse } from "next/server";

// TODO: PortOne Webhook 수신/처리 구현
// - X-PortOne-Signature 서명 검증
// - 멱등성 보장 (portone_event_id 중복 체크)
// - Transaction.Paid → 구독 활성화
// - Transaction.Failed → 결제 실패 처리
// - BillingKey.Deleted → 구독 취소 처리
// - payment_events 테이블에 이벤트 기록
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { message: "웹훅 처리 기능 준비 중" },
    { status: 501 }
  );
}
