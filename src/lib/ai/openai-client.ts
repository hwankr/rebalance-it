import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * OpenAI 클라이언트 싱글턴 (서버 전용)
 * OPENAI_API_KEY 환경변수가 없으면 null 반환
 */
export function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
