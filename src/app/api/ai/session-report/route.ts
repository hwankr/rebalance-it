import { NextRequest, NextResponse } from "next/server";
import { requirePlan } from "@/lib/subscription/guard";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { sanitizeOutput } from "@/lib/ai/safety";
import { SESSION_REPORT_SYSTEM_PROMPT } from "@/lib/ai/prompts/session-report";
import {
  checkAndIncrementUsage,
  addUsageHeaders,
  createLimitExceededResponse,
} from "@/lib/ai/usage-tracker";

const MAX_SESSION_DATA_LENGTH = 8000;

interface RequestBody {
  sessionData: string;
}

/** 프롬프트 인젝션 방지를 위한 입력 정제 */
function sanitizeInput(text: string, maxLength: number): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .trim()
    .slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  // Plus 플랜 전용
  let planResult: Awaited<ReturnType<typeof requirePlan>>;
  try {
    planResult = await requirePlan("plus");
  } catch (res) {
    if (res instanceof Response) return res;
    return NextResponse.json({ error: "인증 오류" }, { status: 401 });
  }
  const { user, plan } = planResult;

  const usage = await checkAndIncrementUsage(user.id, 'ai_session_report', plan);
  if (!usage.allowed) {
    return createLimitExceededResponse('ai_session_report', usage.dailyLimit);
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return NextResponse.json(
      { error: "AI 기능을 사용할 수 없습니다. (API 키 미설정)" },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { sessionData } = body;

  if (!sessionData || typeof sessionData !== "string") {
    return NextResponse.json(
      { error: "유효하지 않은 요청입니다. sessionData는 필수입니다." },
      { status: 400 },
    );
  }

  const safeData = sanitizeInput(sessionData, MAX_SESSION_DATA_LENGTH);

  const userPrompt = `다음은 리밸런싱 세션 데이터입니다. 한국어로 사실적으로 요약해주세요:\n\n${safeData}`;

  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SESSION_REPORT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.3,
      },
      { timeout: 30000 },
    );

    const rawOutput = completion.choices[0]?.message?.content ?? "";
    const safeOutput = sanitizeOutput(rawOutput);

    const response = NextResponse.json({ report: safeOutput });
    addUsageHeaders(response.headers, usage.remaining, usage.dailyLimit);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 리포트 생성 실패" },
      { status: 500 },
    );
  }
}
