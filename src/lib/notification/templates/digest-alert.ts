import { emailLayout } from "./layout";

interface DigestAlertData {
  userName: string;
  digestPeriod: { from: string; to: string };
  dailySnapshots: {
    date: string;
    portfolios: {
      name: string;
      maxDrift: number;
      thresholdPct: number;
      driftedStocks: {
        name: string;
        currentPct: number;
        targetPct: number;
        driftPct: number;
      }[];
    }[];
  }[];
  isApproximate: boolean;
}

export function digestAlertTemplate(
  data: DigestAlertData,
  unsubscribeUrl: string,
): { subject: string; html: string } {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://rebalance-it.app";

  const snapshotSections = data.dailySnapshots
    .map((snapshot) => {
      const portfolioRows = snapshot.portfolios
        .map((portfolio) => {
          const stockRows = portfolio.driftedStocks
            .map(
              (stock) => `
              <tr>
                <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${stock.name}</td>
                <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right;">${stock.currentPct.toFixed(1)}%</td>
                <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right;">${stock.targetPct.toFixed(1)}%</td>
                <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:${stock.driftPct > 0 ? "#dc2626" : "#2563eb"};text-align:right;font-weight:600;">${stock.driftPct > 0 ? "+" : ""}${stock.driftPct.toFixed(1)}%</td>
              </tr>`,
            )
            .join("");

          return `
            <div style="margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                <span style="font-size:14px;font-weight:600;color:#111827;">${portfolio.name}</span>
                <span style="display:inline-block;padding:2px 6px;background-color:#fef2f2;color:#dc2626;border-radius:99px;font-size:11px;font-weight:500;">최대 ${portfolio.maxDrift.toFixed(1)}%</span>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:6px;overflow:hidden;border:1px solid #e5e7eb;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th style="padding:6px 10px;font-size:11px;font-weight:600;color:#6b7280;text-align:left;">종목</th>
                    <th style="padding:6px 10px;font-size:11px;font-weight:600;color:#6b7280;text-align:right;">현재</th>
                    <th style="padding:6px 10px;font-size:11px;font-weight:600;color:#6b7280;text-align:right;">목표</th>
                    <th style="padding:6px 10px;font-size:11px;font-weight:600;color:#6b7280;text-align:right;">편차</th>
                  </tr>
                </thead>
                <tbody>
                  ${stockRows}
                </tbody>
              </table>
            </div>`;
        })
        .join("");

      return `
        <div style="margin-bottom:20px;padding:16px;background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;">
          <div style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">
            <span style="font-size:14px;font-weight:600;color:#4b5563;">${snapshot.date}</span>
          </div>
          ${portfolioRows}
        </div>`;
    })
    .join("");

  const approximateWarning = data.isApproximate
    ? `<div style="margin-bottom:20px;padding:12px 16px;background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#92400e;">⚠️ 일부 가격 정보가 최신이 아닐 수 있습니다 (48시간 이상 경과).</p>
      </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">안녕하세요, ${data.userName}님</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">
      ${data.digestPeriod.from} ~ ${data.digestPeriod.to} 기간 동안 포트폴리오 드리프트가 감지되었습니다.
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#9ca3af;">총 ${data.dailySnapshots.length}건의 드리프트 기록을 요약합니다.</p>

    ${approximateWarning}
    ${snapshotSections}

    <div style="margin-top:28px;text-align:center;">
      <a href="${appUrl}/rebalance" style="display:inline-block;padding:14px 32px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">리밸런싱 페이지에서 확인하기</a>
    </div>`;

  return {
    subject: `📊 포트폴리오 드리프트 요약 (${data.digestPeriod.from} ~ ${data.digestPeriod.to})`,
    html: emailLayout(content, unsubscribeUrl),
  };
}
