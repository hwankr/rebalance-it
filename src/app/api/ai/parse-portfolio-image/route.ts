import { NextRequest, NextResponse } from "next/server";
import { zodResponseFormat } from "openai/helpers/zod";
import { requirePlan } from "@/lib/subscription/guard";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { checkOutputSafety } from "@/lib/ai/safety";
import { PARSE_PORTFOLIO_IMAGE_SYSTEM_PROMPT } from "@/lib/ai/prompts/parse-portfolio-image";
import {
  ParsePortfolioImageSchema,
  type RawParsedStock,
} from "@/lib/ai/schemas/parse-portfolio-image";
import {
  checkAndIncrementUsage,
  addUsageHeaders,
  createLimitExceededResponse,
} from "@/lib/ai/usage-tracker";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/** 후처리 완료된 최종 데이터 */
interface ParsedStock {
  stock_name: string;
  stock_code: string | null;
  quantity: number;
  avg_price: number;
  currency: "KRW" | "USD";
}

/**
 * 후처리: Vision AI의 raw 데이터를 정제합니다.
 * - avg_price가 0이고 total_amount가 있으면 → avg_price = total_amount / quantity
 * - quantity가 0이거나 음수인 종목 제외
 * - avg_price와 total_amount 둘 다 0인 종목 제외
 * - 숫자 타입 강제 변환 (AI가 문자열로 반환할 수 있음)
 */
function postProcessStocks(rawStocks: RawParsedStock[]): ParsedStock[] {
  return rawStocks
    .map((stock) => {
      const quantity = Math.round(Number(stock.quantity) || 0);
      let avgPrice = Number(stock.avg_price) || 0;
      const totalAmount = Number(stock.total_amount) || 0;

      // 핵심 로직: avg_price가 없고 total_amount만 있으면 계산
      if (avgPrice === 0 && totalAmount > 0 && quantity > 0) {
        avgPrice = totalAmount / quantity;
      }

      // 통화에 따라 소수점 처리
      if (stock.currency === "KRW") {
        avgPrice = Math.round(avgPrice);
      } else {
        avgPrice = Math.round(avgPrice * 100) / 100;
      }

      return {
        stock_name: String(stock.stock_name).trim(),
        stock_code: stock.stock_code ? String(stock.stock_code).trim() : null,
        quantity,
        avg_price: avgPrice,
        currency: stock.currency === "USD" ? "USD" as const : "KRW" as const,
      };
    })
    .filter((stock) => {
      // 유효하지 않은 데이터 필터링
      if (!stock.stock_name) return false;
      if (stock.quantity <= 0) return false;
      if (stock.avg_price <= 0) return false;
      return true;
    });
}

export async function POST(request: NextRequest) {
  let planResult: Awaited<ReturnType<typeof requirePlan>>;
  try {
    planResult = await requirePlan("plus");
  } catch (res) {
    if (res instanceof Response) return res;
    return NextResponse.json({ error: "인증 오류" }, { status: 401 });
  }
  const { user, plan } = planResult;

  const usage = await checkAndIncrementUsage(user.id, 'ai_image_import', plan);
  if (!usage.allowed) {
    return createLimitExceededResponse('ai_image_import', usage.dailyLimit);
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return NextResponse.json(
      { error: "AI 기능을 사용할 수 없습니다. (API 키 미설정)" },
      { status: 503 },
    );
  }

  let body: { image?: unknown; mimeType?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { image, mimeType } = body;

  if (!image || typeof image !== "string") {
    return NextResponse.json(
      { error: "image (base64) 필드가 필요합니다." },
      { status: 400 },
    );
  }

  // base64 크기 검증 (base64는 원본 대비 ~33% 더 큼)
  const estimatedSize = (image.length * 3) / 4;
  if (estimatedSize > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { error: "이미지가 너무 큽니다. 5MB 이하로 업로드해주세요." },
      { status: 400 },
    );
  }

  const mediaType =
    typeof mimeType === "string" && ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)
      ? mimeType
      : "image/jpeg";

  try {
    const completion = await openai.chat.completions.parse(
      {
        model: "gpt-4.1",
        messages: [
          { role: "system", content: PARSE_PORTFOLIO_IMAGE_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${image}`,
                  detail: "high",
                },
              },
              {
                type: "text",
                text: "이 증권사 앱 스크린샷에서 보유종목 정보를 추출해주세요. 평균매입가가 없으면 매입금액을 total_amount에 기록해주세요.",
              },
            ],
          },
        ],
        response_format: zodResponseFormat(ParsePortfolioImageSchema, "parse_portfolio_image"),
        max_tokens: 4000,
        temperature: 0,
      },
      { timeout: 60000 },
    );

    const message = completion.choices[0]?.message;

    // Refusal 체크
    if (message?.refusal) {
      return NextResponse.json(
        { error: "AI가 이미지 분석을 거부했습니다." },
        { status: 500 },
      );
    }

    // 안전성 검사 (투자 조언 패턴 차단) — raw content 기반
    const rawResponse = message?.content ?? "";
    const safetyResult = checkOutputSafety(rawResponse);
    if (!safetyResult.safe) {
      console.warn("[parse-portfolio-image] Safety filter triggered:", safetyResult.flaggedPattern);
      return NextResponse.json(
        { error: "AI 응답이 안전 필터에 의해 차단되었습니다." },
        { status: 500 },
      );
    }

    if (!message?.parsed) {
      return NextResponse.json(
        { error: "AI 응답 파싱 실패" },
        { status: 500 },
      );
    }

    // 후처리: avg_price 계산, 데이터 정제, 유효성 검증
    const processedStocks = postProcessStocks(message.parsed.stocks);

    const response = NextResponse.json({ stocks: processedStocks });
    addUsageHeaders(response.headers, usage.remaining, usage.dailyLimit);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("[parse-portfolio-image] JSON parse failed for AI response");
      return NextResponse.json(
        { error: "AI 응답 파싱 실패" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 이미지 분석 실패" },
      { status: 500 },
    );
  }
}
