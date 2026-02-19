interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  unsubscribeToken: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rebalance-it.app";

  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY가 설정되지 않았습니다." };
  }

  if (!fromEmail) {
    return { success: false, error: "RESEND_FROM_EMAIL이 설정되지 않았습니다." };
  }

  const unsubscribeUrl = `${appUrl}/api/notification/unsubscribe?token=${options.unsubscribeToken}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { id?: string };
      return { success: true, messageId: data.id };
    }

    const errorData = (await response.json().catch(() => ({}))) as { message?: string };
    return {
      success: false,
      error: errorData.message ?? `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "이메일 전송 중 오류가 발생했습니다.",
    };
  }
}
