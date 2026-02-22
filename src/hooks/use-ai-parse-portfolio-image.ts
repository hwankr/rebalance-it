"use client";

import { useMutation } from "@tanstack/react-query";
export interface ParsedStock {
  stock_name: string;
  stock_code: string | null;
  quantity: number;
  avg_price: number;
  currency: "KRW" | "USD";
}

interface ParsePortfolioImageResponse {
  stocks: ParsedStock[];
}

export function useAIParsePortfolioImage() {
  return useMutation({
    mutationFn: async (file: File): Promise<ParsePortfolioImageResponse> => {
      const base64 = await fileToBase64(file);

      const res = await fetch("/api/ai/parse-portfolio-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `AI 이미지 분석 실패 (${res.status})`);
      }

      return res.json();
    },
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/jpeg;base64,... → base64 부분만 추출
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("파일을 읽을 수 없습니다."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}
