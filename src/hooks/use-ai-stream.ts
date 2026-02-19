"use client";

import { useState, useCallback, useRef } from "react";

interface UseAIStreamOptions {
  url: string;
}

interface UseAIStreamReturn {
  text: string;
  isStreaming: boolean;
  error: string | null;
  start: (body: Record<string, unknown>) => void;
  reset: () => void;
}

/**
 * SSE 스트리밍 AI 응답을 소비하는 클라이언트 훅
 * data: {"text": "delta"} 형식의 SSE 이벤트를 파싱합니다.
 */
export function useAIStream({ url }: UseAIStreamOptions): UseAIStreamReturn {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setText("");
    setIsStreaming(false);
    setError(null);
  }, []);

  const start = useCallback(
    async (body: Record<string, unknown>) => {
      reset();
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `요청 실패 (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("스트림을 열 수 없습니다.");

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.error) {
                setError(event.error);
                setIsStreaming(false);
                return;
              }

              if (event.replace) {
                // 안전 필터에 의한 전체 교체
                accumulated = event.replace;
                setText(accumulated);
              } else if (event.text) {
                accumulated += event.text;
                setText(accumulated);
              }

              if (event.done) {
                setIsStreaming(false);
                return;
              }
            } catch {
              // 파싱 오류 무시
            }
          }
        }

        setIsStreaming(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "스트리밍 오류");
        setIsStreaming(false);
      }
    },
    [url, reset],
  );

  return { text, isStreaming, error, start, reset };
}
