import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/subscription/guard";

export async function GET() {
  try {
    const { user, supabase } = await requireAuth();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_tier, status, current_period_end, billing_cycle")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ plan_tier: "free" });
    }

    return NextResponse.json({
      plan_tier: sub.plan_tier,
      status: sub.status,
      current_period_end: sub.current_period_end,
      billing_cycle: sub.billing_cycle,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json(
      { error: "구독 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
