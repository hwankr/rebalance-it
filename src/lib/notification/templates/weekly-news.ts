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
      // AI 종합 요약 (출처 포함)
      const hasSummary = s.summary && !s.summary.includes("•");
      const summaryHtml = hasSummary
        ? `<div style="margin:0 0 14px;font-size:13px;color:#374151;line-height:1.7;">${escapeHtml(s.summary).replace(/\(([^)]+)\)/g, '<span style="color:#6b7280;font-size:12px;">($1)</span>')}</div>`
        : "";

      // 개별 기사 목록 (메인 콘텐츠)
      const articles = s.articles ?? [];
      const articlesHtml = articles.length > 0
        ? articles.map((a) => {
            const dateStr = a.publishedAt ? formatArticleDate(a.publishedAt) : "";
            const metaItems = [a.source ? escapeHtml(a.source) : "", dateStr].filter(Boolean).join(" · ");
            const excerptHtml = a.summary
              ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;line-height:1.5;">${escapeHtml(a.summary)}${a.summary.length >= 140 ? "…" : ""}</p>`
              : "";

            return `
              <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6;">
                <a href="${escapeHtml(a.url)}" style="font-size:13px;font-weight:500;color:#1d4ed8;text-decoration:none;line-height:1.4;" target="_blank">${escapeHtml(a.title)}</a>
                ${metaItems ? `<p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">${metaItems}</p>` : ""}
                ${excerptHtml}
              </div>`;
          }).join("")
        : `<p style="font-size:13px;color:#9ca3af;">수집된 기사가 없습니다.</p>`;

      return `
        <div style="margin-bottom:24px;padding:18px 20px;background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
          <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">
            <span style="font-size:16px;font-weight:700;color:#111827;">${escapeHtml(s.stockName)}</span>
            <span style="margin-left:8px;font-size:12px;color:#9ca3af;font-family:monospace;">${escapeHtml(s.stockCode)}</span>
            <span style="margin-left:8px;font-size:11px;color:#6b7280;">뉴스 ${s.newsCount}건</span>
          </div>
          ${summaryHtml}
          ${articlesHtml}
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
      <a href="${appUrl}/portfolio" style="display:inline-block;padding:14px 32px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:-0.2px;">포트폴리오 확인하기</a>
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

function formatArticleDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return "";
  }
}
