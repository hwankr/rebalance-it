"use client";

import { format } from "date-fns";

export interface DataSourceMeta {
  /** ISO 8601 timestamp — actual data time if available, otherwise server fetch time */
  fetchedAt: string;
  /** Human-readable provider name (e.g. "Yahoo Finance", "네이버 금융") */
  provider: string;
}

interface DataSourceFooterProps {
  /** ISO 8601 timestamp, or null/undefined if unavailable */
  fetchedAt?: string | null;
  /** Provider name string */
  provider?: string;
  /** Optional className override */
  className?: string;
}

export function DataSourceFooter({ fetchedAt, provider, className }: DataSourceFooterProps) {
  if (!fetchedAt && !provider) return null;

  const timeLabel = fetchedAt
    ? format(new Date(fetchedAt), "yy.MM.dd HH:mm")
    : "-";

  return (
    <p className={className ?? "mt-3 text-[10px] text-muted-foreground/60"}>
      {`기준: ${timeLabel}`}
      {provider && ` · 제공: ${provider}`}
    </p>
  );
}
