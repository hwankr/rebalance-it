import { NextRequest, NextResponse } from "next/server";
import { requirePlan } from "@/lib/subscription/guard";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { sanitizeOutput } from "@/lib/ai/safety";
import {
  FINANCIAL_SUMMARY_SYSTEM_PROMPT,
  NEWS_SUMMARY_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/stock-summary";
import {
  checkAndIncrementUsage,
  addUsageHeaders,
  createLimitExceededResponse,
} from "@/lib/ai/usage-tracker";

type SummaryType = "financials" | "news";

const VALID_TYPES: SummaryType[] = ["financials", "news"];
const MAX_STOCK_NAME_LENGTH = 100;
const MAX_DATA_LENGTH = 5000;

interface RequestBody {
  type: SummaryType;
  data: string; // JSON-serialized financial data or news items
  stockName: string;
}

/** 프롬프트 인젝션 방지를 위한 입력 정제 */
function sanitizeInput(text: string, maxLength: number): string {
  return text.replace(/[\n\r\t]/g, " ").trim().slice(0, maxLength);
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

  const usage = await checkAndIncrementUsage(user.id, 'ai_summary', plan);
  if (!usage.allowed) {
    return createLimitExceededResponse('ai_summary', usage.dailyLimit);
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

  const { type, data, stockName } = body;

  if (!type || !VALID_TYPES.includes(type) || !data || !stockName) {
    return NextResponse.json(
      { error: "유효하지 않은 요청입니다. type(financials|news), data, stockName은 필수입니다." },
      { status: 400 },
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

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }, { timeout: 30000 });

    const rawOutput = completion.choices[0]?.message?.content ?? "";
    const safeOutput = sanitizeOutput(rawOutput);

    const response = NextResponse.json({
      summary: safeOutput,
      tokens: {
        prompt: completion.usage?.prompt_tokens ?? 0,
        completion: completion.usage?.completion_tokens ?? 0,
      },
    });
    addUsageHeaders(response.headers, usage.remaining, usage.dailyLimit);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 요약 생성 실패" },
      { status: 500 },
    );
  }
}
