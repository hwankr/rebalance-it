import { emailLayout } from "./layout";
import type { StockNewsSummary } from "../news-summarizer";

export interface WeeklyNewsData {
  userName: string;
  weekLabel: string; // e.g. "2026년 2월 3주차"
  summaries: StockNewsSummary[];
  totalStocks: number;
}

export function weeklyNewsTemplate(
  data: WeeklyNewsData,
  unsubscribeUrl: string,
): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rebalance-it.app";

  const stockSections = data.summaries
    .map((s) => {
      // AI 요약은 일반 텍스트, 폴백은 bullet 목록
      const summaryHtml = s.summary.includes("•")
        ? s.summary
            .split("\n")
            .map((line) => `<p style="margin:4px 0;font-size:13px;color:#374151;line-height:1.5;">${escapeHtml(line)}</p>`)
            .join("")
        : `<p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">${escapeHtml(s.summary)}</p>`;

      return `
        <div style="margin-bottom:20px;padding:16px 20px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
          <div style="margin-bottom:8px;display:flex;align-items:center;">
            <span style="font-size:15px;font-weight:600;color:#111827;">${escapeHtml(s.stockName)}</span>
            <span style="margin-left:8px;font-size:12px;color:#9ca3af;font-family:monospace;">${escapeHtml(s.stockCode)}</span>
            <span style="margin-left:auto;font-size:11px;color:#9ca3af;">뉴스 ${s.newsCount}건</span>
          </div>
          ${summaryHtml}
        </div>`;
    })
    .join("");

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">📰 ${escapeHtml(data.userName)}님의 ${escapeHtml(data.weekLabel)} 뉴스 브리핑</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">관심 종목 ${data.totalStocks}개의 주간 뉴스 요약입니다.</p>

    ${stockSections}

    <div style="margin-top:12px;padding:12px 16px;background-color:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
      <p style="margin:0;font-size:12px;color:#1e40af;">
        💡 뉴스 브리핑은 AI가 자동 생성한 요약이며, 투자 권유가 아닙니다. 투자 판단은 본인의 책임하에 이루어져야 합니다.
      </p>
    </div>

    <div style="margin-top:28px;text-align:center;">
      <a href="${appUrl}/manual-portfolio" style="display:inline-block;padding:14px 32px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">포트폴리오 확인하기</a>
    </div>`;

  return {
    subject: `📰 ${data.weekLabel} 종목 뉴스 브리핑`,
    html: emailLayout(content, unsubscribeUrl),
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
