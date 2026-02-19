import { emailLayout } from "./layout";

interface DriftAlertData {
  userName: string;
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
  isApproximate: boolean;
}

export function driftAlertTemplate(
  data: DriftAlertData,
  unsubscribeUrl: string
): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rebalance-it.app";

  const portfolioRows = data.portfolios
    .map((portfolio) => {
      const stockRows = portfolio.driftedStocks
        .map(
          (stock) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;">${stock.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;text-align:right;">${stock.currentPct.toFixed(1)}%</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151;text-align:right;">${stock.targetPct.toFixed(1)}%</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:${stock.driftPct > 0 ? "#dc2626" : "#2563eb"};text-align:right;font-weight:600;">${stock.driftPct > 0 ? "+" : ""}${stock.driftPct.toFixed(1)}%</td>
          </tr>`
        )
        .join("");

      return `
        <div style="margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="font-size:16px;font-weight:600;color:#111827;">${portfolio.name}</span>
            <span style="display:inline-block;padding:2px 8px;background-color:#fef2f2;color:#dc2626;border-radius:99px;font-size:12px;font-weight:500;">최대 편차 ${portfolio.maxDrift.toFixed(1)}%</span>
          </div>
          <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">설정 임계값: ${portfolio.thresholdPct}% 초과</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
            <thead>
              <tr style="background-color:#f9fafb;">
                <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:left;">종목</th>
                <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:right;">현재비중</th>
                <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:right;">목표비중</th>
                <th style="padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:right;">편차</th>
              </tr>
            </thead>
            <tbody>
              ${stockRows}
            </tbody>
          </table>
        </div>`;
    })
    .join("");

  const approximateWarning = data.isApproximate
    ? `<div style="margin-bottom:20px;padding:12px 16px;background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#92400e;">⚠️ 가격 정보가 최신이 아닐 수 있습니다 (48시간 이상 경과). 실제 현재가와 차이가 있을 수 있습니다.</p>
      </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">안녕하세요, ${data.userName}님</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">회원님의 포트폴리오가 목표 비중에서 크게 벗어났습니다. 리밸런싱을 검토해 보세요.</p>

    ${approximateWarning}
    ${portfolioRows}

    <div style="margin-top:28px;text-align:center;">
      <a href="${appUrl}/rebalance" style="display:inline-block;padding:14px 32px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">리밸런싱 페이지에서 확인하기</a>
    </div>`;

  return {
    subject: "⚠️ 포트폴리오 리밸런싱이 필요합니다",
    html: emailLayout(content, unsubscribeUrl),
  };
}
