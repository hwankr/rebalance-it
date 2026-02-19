import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/subscription/guard";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { checkOutputSafety } from "@/lib/ai/safety";
import { PARSE_PORTFOLIO_SYSTEM_PROMPT } from "@/lib/ai/prompts/parse-portfolio";

const MAX_INPUT_LENGTH = 10000;

export interface ParsedStock {
  stock_name: string;
  stock_code: string | null;
  quantity: number;
  avg_price: number;
  currency: "KRW" | "USD";
}

interface AIJsonResponse {
  stocks: ParsedStock[];
}

/** 프롬프트 인젝션 방지 및 입력 정제 */
function sanitizeInput(text: string): string {
  // 제어 문자 제거 (줄바꿈 \n과 탭 \t은 유지)
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .slice(0, MAX_INPUT_LENGTH);
}

export async function POST(request: NextRequest) {
  // 인증 확인 (무료 사용자 포함)
  try {
    await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    return NextResponse.json({ error: "인증 오류" }, { status: 401 });
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return NextResponse.json(
      { error: "AI 기능을 사용할 수 없습니다. (API 키 미설정)" },
      { status: 503 },
    );
  }

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { text } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "text 필드가 필요합니다." },
      { status: 400 },
    );
  }

  const safeText = sanitizeInput(text);

  let rawResponse = "";
  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: PARSE_PORTFOLIO_SYSTEM_PROMPT },
          { role: "user", content: safeText },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0,
      },
      { timeout: 30000 },
    );

    rawResponse = completion.choices[0]?.message?.content ?? "";

    // 안전성 검사 (투자 조언 패턴 차단)
    const safetyResult = checkOutputSafety(rawResponse);
    if (!safetyResult.safe) {
      console.warn("[parse-portfolio] Safety filter triggered:", safetyResult.flaggedPattern);
      return NextResponse.json(
        { error: "AI 응답이 안전 필터에 의해 차단되었습니다." },
        { status: 500 },
      );
    }

    const parsed: AIJsonResponse = JSON.parse(rawResponse);

    if (!Array.isArray(parsed.stocks)) {
      return NextResponse.json(
        { error: "AI 응답 파싱 실패: stocks 배열이 없습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      stocks: parsed.stocks,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("[parse-portfolio] JSON parse failed for AI response");
      return NextResponse.json(
        { error: "AI 응답 파싱 실패" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 파싱 실패" },
      { status: 500 },
    );
  }
}
