export function emailLayout(content: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rebalance-it</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .email-wrapper { background-color: #1a1a2e !important; }
      .email-card { background-color: #16213e !important; color: #e0e0e0 !important; }
      .email-header { background-color: #0f3460 !important; }
      .email-footer { color: #888 !important; }
      .email-footer a { color: #aaa !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table class="email-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td class="email-header" style="background-color:#1d4ed8;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Rebalance-it</span>
                    <span style="color:#93c5fd;font-size:13px;margin-left:8px;">포트폴리오 리밸런싱</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding:20px 32px 28px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">이 이메일은 Rebalance-it에서 발송되었습니다.</p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                더 이상 알림을 받지 않으려면
                <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">수신거부</a>
                하세요.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
