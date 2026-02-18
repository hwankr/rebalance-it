/**
 * AI 출력 안전 필터링
 * 자본시장법 위반 방지를 위한 금지어 탐지 및 차단
 */

const BLOCKED_PATTERNS = [
  // 매매 추천
  /매수\s*(하|해|합|권|추천|하세요|하시|드립|할\s*것)/,
  /매도\s*(하|해|합|권|추천|하세요|하시|드립|할\s*것)/,
  /사세요|사십시오|팔세요|팔아/,
  /사는\s*(게|것이|것을)\s*(좋|낫)/,
  /파는\s*(게|것이|것을)\s*(좋|낫)/,
  // 투자 추천
  /추천\s*(합|드|종목|포트폴리오)/,
  /투자\s*(하세요|하시|하는\s*것이\s*좋)/,
  // 전망/예측
  /오를\s*(것|거|듯|전망)/,
  /내릴\s*(것|거|듯|전망)/,
  /상승\s*(할|전망|예상)/,
  /하락\s*(할|전망|예상)/,
  /목표\s*가|목표가/,
  // 영문 패턴
  /\b(should|must|recommend)\s+(buy|sell|invest)/i,
  /\bbuy\s+now\b/i,
  /\bstrong\s+(buy|sell)\b/i,
];

export interface SafetyCheckResult {
  safe: boolean;
  flaggedPattern: string | null;
}

/**
 * AI 응답에서 투자 추천/자문 패턴을 검출합니다.
 * @returns safe=true면 안전, safe=false면 금지어 포함
 */
export function checkOutputSafety(text: string): SafetyCheckResult {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { safe: false, flaggedPattern: pattern.source };
    }
  }
  return { safe: true, flaggedPattern: null };
}

/**
 * 안전하지 않은 응답을 대체 메시지로 교체합니다.
 */
export function sanitizeOutput(text: string): string {
  const result = checkOutputSafety(text);
  if (!result.safe) {
    return "해당 요청에 대한 응답을 생성할 수 없습니다. 본 서비스는 투자 자문을 제공하지 않습니다.";
  }
  return text;
}
