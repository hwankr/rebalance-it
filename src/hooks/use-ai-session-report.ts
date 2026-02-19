"use client";

import { useMutation } from "@tanstack/react-query";

interface SessionReportResponse {
  report: string;
}

export function useAISessionReport() {
  return useMutation({
    mutationFn: async (sessionData: string): Promise<SessionReportResponse> => {
      const res = await fetch("/api/ai/session-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionData }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `AI 리포트 생성 실패 (${res.status})`);
      }

      return res.json();
    },
  });
}
