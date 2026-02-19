import { emailLayout } from "./layout";
import type { MonthlyReportData } from "../monthly-report";

function formatKrw(amount: number): string {
  return `₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

function formatPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function monthlyReportTemplate(
  data: MonthlyReportData,
  unsubscribeUrl: string
): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rebalance-it.app";

  // 포트폴리오별 현황
  const portfolioSections = data.portfolios
    .map((p) => {
      const statusIcon = p.needsRebalancing ? "⚠️" : "✅";
      const statusText = p.needsRebalancing ? "리밸런싱 필요" : "정상 범위";
      const statusColor = p.needsRebalancing ? "#dc2626" : "#16a34a";

      // 드리프트 초과 종목 테이블
      const driftTable =
        p.driftedStocks.length > 0
          ? `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <thead>
            <tr style="background-color:#f9fafb;">
              <th style="padding:8px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:left;">종목</th>
              <th style="padding:8px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:right;">현재</th>
              <th style="padding:8px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:right;">목표</th>
              <th style="padding:8px 12px;font-size:12px;font-weight:600;color:#6b7280;text-align:right;">편차</th>
            </tr>
          </thead>
          <tbody>
            ${p.driftedStocks
              .map(
                (s) => `
              <tr>
                <td style="padding:8px 12px;border-top:1px solid #f3f4f6;font-size:13px;color:#374151;">${s.name}</td>
                <td style="padding:8px 12px;border-top:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right;">${s.currentPct.toFixed(1)}%</td>
                <td style="padding:8px 12px;border-top:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right;">${s.targetPct.toFixed(1)}%</td>
                <td style="padding:8px 12px;border-top:1px solid #f3f4f6;font-size:13px;text-align:right;font-weight:600;color:${s.driftPct > 0 ? "#dc2626" : "#2563eb"};">${formatPct(s.driftPct)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`
          : "";

      return `
        <div style="margin-bottom:24px;padding:20px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
          <div style="margin-bottom:12px;">
            <span style="font-size:16px;font-weight:600;color:#111827;">${p.name}</span>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#6b7280;">총 평가금액</td>
              <td style="padding:4px 0;font-size:13px;color:#111827;text-align:right;font-weight:500;">${formatKrw(p.totalValue)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#6b7280;">종목 수</td>
              <td style="padding:4px 0;font-size:13px;color:#111827;text-align:right;">${p.stockCount}개</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#6b7280;">최대 드리프트</td>
              <td style="padding:4px 0;font-size:13px;color:#111827;text-align:right;">${p.maxDrift.toFixed(1)}% (임계치 ${p.thresholdPct}%)</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#6b7280;">상태</td>
              <td style="padding:4px 0;font-size:13px;text-align:right;font-weight:500;color:${statusColor};">${statusIcon} ${statusText}</td>
            </tr>
          </table>
          ${driftTable}
        </div>`;
    })
    .join("");

  // 전월 대비 변동
  const changeSign = data.totalAssetChange >= 0 ? "+" : "";
  const changeColor = data.totalAssetChange >= 0 ? "#16a34a" : "#dc2626";
  const changeSection = data.totalAssetChange !== 0
    ? `<tr>
        <td style="padding:6px 0;font-size:14px;color:#6b7280;">전월 대비</td>
        <td style="padding:6px 0;font-size:14px;text-align:right;font-weight:600;color:${changeColor};">${changeSign}${formatKrw(data.totalAssetChange)} (${formatPct(data.totalAssetChangePct)})</td>
       </tr>`
    : "";

  // 리밸런싱 활동
  const activitySection = `
    <div style="margin-top:24px;padding:20px;background-color:#eff6ff;border-radius:12px;border:1px solid #bfdbfe;">
      <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#1e40af;">이번 달 리밸런싱 활동</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#3b82f6;">실행 횟수</td>
          <td style="padding:4px 0;font-size:13px;color:#1e40af;text-align:right;font-weight:500;">${data.rebalancingActivity.executionCount}회</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#3b82f6;">완료된 세션</td>
          <td style="padding:4px 0;font-size:13px;color:#1e40af;text-align:right;">${data.rebalancingActivity.completedSessions}건</td>
        </tr>
        ${
          data.rebalancingActivity.inProgressSessions > 0
            ? `<tr>
                <td style="padding:4px 0;font-size:13px;color:#3b82f6;">진행 중</td>
                <td style="padding:4px 0;font-size:13px;color:#1e40af;text-align:right;">${data.rebalancingActivity.inProgressSessions}건</td>
               </tr>`
            : ""
        }
      </table>
    </div>`;

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">📊 ${data.userName}님의 ${data.reportMonth} 리포트</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">매월 1일 발송되는 포트폴리오 현황 리포트입니다.</p>

    <!-- 총자산 요약 -->
    <div style="margin-bottom:24px;padding:20px;background-color:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6b7280;">총 자산</td>
          <td style="padding:6px 0;font-size:20px;text-align:right;font-weight:700;color:#111827;">${formatKrw(data.totalAsset)}</td>
        </tr>
        ${changeSection}
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#6b7280;">포트폴리오 수</td>
          <td style="padding:6px 0;font-size:14px;text-align:right;color:#111827;">${data.portfolios.length}개</td>
        </tr>
      </table>
    </div>

    <!-- 계좌별 현황 -->
    <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#111827;">계좌별 현황</h3>
    ${portfolioSections}

    <!-- 리밸런싱 활동 -->
    ${activitySection}

    <!-- CTA -->
    <div style="margin-top:28px;text-align:center;">
      <a href="${appUrl}/portfolio" style="display:inline-block;padding:14px 32px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">포트폴리오 확인하기</a>
    </div>`;

  return {
    subject: `📊 ${data.reportMonth} 포트폴리오 리포트`,
    html: emailLayout(content, unsubscribeUrl),
  };
}
