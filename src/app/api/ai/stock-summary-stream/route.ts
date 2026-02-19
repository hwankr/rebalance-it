import { NextRequest } from "next/server";
import { requirePlan } from "@/lib/subscription/guard";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { checkOutputSafety } from "@/lib/ai/safety";
import {
  FINANCIAL_SUMMARY_SYSTEM_PROMPT,
  NEWS_SUMMARY_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/stock-summary";

type SummaryType = "financials" | "news";

const VALID_TYPES: SummaryType[] = ["financials", "news"];
const MAX_STOCK_NAME_LENGTH = 100;
const MAX_DATA_LENGTH = 5000;

interface RequestBody {
  type: SummaryType;
  data: string;
  stockName: string;
}

function sanitizeInput(text: string, maxLength: number): string {
  return text.replace(/[\n\r\t]/g, " ").trim().slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  try {
    await requirePlan("pro");
  } catch (res) {
    if (res instanceof Response) return res;
    return new Response(JSON.stringify({ error: "인증 오류" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return new Response(
      JSON.stringify({ error: "AI 기능을 사용할 수 없습니다. (API 키 미설정)" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 요청입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { type, data, stockName } = body;

  if (!type || !VALID_TYPES.includes(type) || !data || !stockName) {
    return new Response(
      JSON.stringify({ error: "유효하지 않은 요청입니다." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const safeName = sanitizeInput(stockName, MAX_STOCK_NAME_LENGTH);
  const safeData = sanitizeInput(data, MAX_DATA_LENGTH);

  const systemPrompt =
    type === "financials"
      ? FINANCIAL_SUMMARY_SYSTEM_PROMPT
      : NEWS_SUMMARY_SYSTEM_PROMPT;

  const userPrompt =
    type === "financials"
      ? `다음은 ${safeName}의 재무 데이터입니다. 간결하게 한국어로 요약해주세요:\n\n${safeData}`
      : `다음은 ${safeName} 관련 최근 뉴스입니다. 각 기사를 1~2문장으로 요약해주세요:\n\n${safeData}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.3,
          stream: true,
        });

        let fullText = "";

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`),
            );
          }
        }

        // 스트림 완료 후 안전성 검사 (버퍼링 후 역추적 검사)
        const safetyResult = checkOutputSafety(fullText);
        if (!safetyResult.safe) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                replace: "해당 요청에 대한 응답을 생성할 수 없습니다. 본 서비스는 투자 자문을 제공하지 않습니다.",
              })}\n\n`,
            ),
          );
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
        );
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: error instanceof Error ? error.message : "AI 요약 생성 실패",
            })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
