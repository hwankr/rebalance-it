import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response(
      buildPage("잘못된 요청입니다", "유효한 수신거부 링크가 아닙니다."),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminSupabaseClient() as any;

    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("id")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (!pref) {
      return new Response(
        buildPage("유효하지 않은 링크입니다", "이미 수신거부 처리되었거나 링크가 만료되었습니다."),
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    await supabase
      .from("notification_preferences")
      .update({ email_enabled: false, notification_enabled: false })
      .eq("unsubscribe_token", token);

    return new Response(
      buildPage(
        "수신거부 완료",
        "이메일 수신이 거부되었습니다. 설정에서 다시 활성화할 수 있습니다."
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch {
    return new Response(
      buildPage("오류가 발생했습니다", "잠시 후 다시 시도해 주세요."),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function buildPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - Rebalance-it</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 48px 40px; max-width: 440px; width: 90%; text-align: center; }
    .logo { font-size: 20px; font-weight: 700; color: #1d4ed8; margin-bottom: 32px; }
    h1 { margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #111827; }
    p { margin: 0 0 28px; font-size: 15px; color: #6b7280; line-height: 1.6; }
    a { display: inline-block; padding: 12px 28px; background-color: #1d4ed8; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Rebalance-it</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/">홈으로 돌아가기</a>
  </div>
</body>
</html>`;
}
