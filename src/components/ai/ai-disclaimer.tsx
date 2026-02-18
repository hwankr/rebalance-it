"use client";

import { Info } from "lucide-react";
import {
  AI_DISCLAIMER_SHORT,
  AI_GENERATED_LABEL,
} from "@/lib/ai/disclaimer";

interface AIDisclaimerProps {
  className?: string;
}

/** AI 생성 콘텐츠 면책 표시 (인공지능기본법 준수) */
export function AIDisclaimer({ className }: AIDisclaimerProps) {
  return (
    <div
      className={`flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground ${className ?? ""}`}
    >
      <Info className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        <span className="mr-1 inline-flex items-center rounded bg-muted px-1 py-0.5 text-[10px] font-medium">
          {AI_GENERATED_LABEL}
        </span>
        {AI_DISCLAIMER_SHORT}
      </span>
    </div>
  );
}
