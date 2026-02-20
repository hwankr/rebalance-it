/**
 * 시연용 데이터 초기화 + 시드 스크립트
 *
 * 사용법: node scripts/seed-demo.mjs
 *
 * 1. 기존 데이터 전부 삭제 (executions → manual_stocks → manual_portfolios → rebalance_settings)
 * 2. 계좌 2개 생성 (국내/해외)
 * 3. 예시 종목 + 목표 비중 삽입
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cachtwsbytobktzuejkr.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY2h0d3NieXRvYmt0enVlamtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg4NjQ4NywiZXhwIjoyMDg2NDYyNDg3fQ.JxtgvRNa1T_gDM8adlIKpaaaI57Foaof5YuSES8ONzM";

const USER_ID = "7a300dae-debe-4c19-ada5-0bfda4248c22";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── 예시 데이터 ─────────────────────────────────────────

const ACCOUNTS = [
  { name: "국내 증권", cash: 3200000, display_order: 0 },
  { name: "해외 투자", cash: 1500000, display_order: 1 },
];

// 국내 증권 계좌 종목
const KR_STOCKS = [
  {
    stock_code: "005930",
    stock_name: "삼성전자",
    quantity: 50,
    avg_price: 62000,
    current_price: 57800,
    currency: "KRW",
    target_pct: 20,
  },
  {
    stock_code: "000660",
    stock_name: "SK하이닉스",
    quantity: 15,
    avg_price: 155000,
    current_price: 198000,
    currency: "KRW",
    target_pct: 20,
  },
  {
    stock_code: "035420",
    stock_name: "NAVER",
    quantity: 25,
    avg_price: 180000,
    current_price: 210000,
    currency: "KRW",
    target_pct: 25,
  },
  {
    stock_code: "035720",
    stock_name: "카카오",
    quantity: 80,
    avg_price: 45000,
    current_price: 38500,
    currency: "KRW",
    target_pct: 10,
  },
  {
    stock_code: "373220",
    stock_name: "LG에너지솔루션",
    quantity: 5,
    avg_price: 350000,
    current_price: 410000,
    currency: "KRW",
    target_pct: 15,
  },
];

// 해외 투자 계좌 종목
const US_STOCKS = [
  {
    stock_code: "AAPL",
    stock_name: "Apple Inc.",
    quantity: 8,
    avg_price: 190,
    current_price: 235,
    currency: "USD",
    target_pct: 30,
  },
  {
    stock_code: "MSFT",
    stock_name: "MICROSOFT CORP",
    quantity: 4,
    avg_price: 400,
    current_price: 430,
    currency: "USD",
    target_pct: 25,
  },
  {
    stock_code: "NVDA",
    stock_name: "NVIDIA CORP",
    quantity: 10,
    avg_price: 120,
    current_price: 140,
    currency: "USD",
    target_pct: 25,
  },
  {
    stock_code: "TSLA",
    stock_name: "Tesla, Inc.",
    quantity: 5,
    avg_price: 320,
    current_price: 380,
    currency: "USD",
    target_pct: 20,
  },
];

// ── 실행 ─────────────────────────────────────────────────

async function run() {
  console.log("=== 시연 데이터 시드 스크립트 ===\n");

  // 1. 기존 데이터 삭제
  console.log("[1/4] 기존 데이터 삭제 중...");

  const { error: e1 } = await supabase
    .from("executions")
    .delete()
    .eq("user_id", USER_ID);
  if (e1) throw new Error(`executions 삭제 실패: ${e1.message}`);
  console.log("  - executions 삭제 완료");

  // manual_stocks는 portfolio_id FK이므로, 먼저 portfolio 목록 조회
  const { data: oldPortfolios } = await supabase
    .from("manual_portfolios")
    .select("id")
    .eq("user_id", USER_ID);

  if (oldPortfolios?.length) {
    const ids = oldPortfolios.map((p) => p.id);
    const { error: e2 } = await supabase
      .from("manual_stocks")
      .delete()
      .in("portfolio_id", ids);
    if (e2) throw new Error(`manual_stocks 삭제 실패: ${e2.message}`);
    console.log("  - manual_stocks 삭제 완료");
  }

  const { error: e3 } = await supabase
    .from("manual_portfolios")
    .delete()
    .eq("user_id", USER_ID);
  if (e3) throw new Error(`manual_portfolios 삭제 실패: ${e3.message}`);
  console.log("  - manual_portfolios 삭제 완료");

  const { error: e4 } = await supabase
    .from("rebalance_settings")
    .delete()
    .eq("user_id", USER_ID);
  if (e4) throw new Error(`rebalance_settings 삭제 실패: ${e4.message}`);
  console.log("  - rebalance_settings 삭제 완료");

  // 2. 계좌 생성
  console.log("\n[2/4] 계좌 생성 중...");
  const portfolioIds = [];

  for (const acct of ACCOUNTS) {
    const { data, error } = await supabase
      .from("manual_portfolios")
      .insert({
        user_id: USER_ID,
        name: acct.name,
        cash: acct.cash,
        display_order: acct.display_order,
      })
      .select("id")
      .single();
    if (error) throw new Error(`계좌 "${acct.name}" 생성 실패: ${error.message}`);
    portfolioIds.push(data.id);
    console.log(`  - "${acct.name}" 생성 (cash: ${acct.cash.toLocaleString()}원)`);
  }

  // 3. 종목 삽입
  console.log("\n[3/4] 종목 추가 중...");

  const now = new Date().toISOString();
  const krRows = KR_STOCKS.map((s) => ({
    portfolio_id: portfolioIds[0],
    ...s,
    is_rebalance_tracked: true,
    price_updated_at: now,
  }));
  const usRows = US_STOCKS.map((s) => ({
    portfolio_id: portfolioIds[1],
    ...s,
    is_rebalance_tracked: true,
    price_updated_at: now,
  }));

  const { error: e5 } = await supabase.from("manual_stocks").insert(krRows);
  if (e5) throw new Error(`국내 종목 삽입 실패: ${e5.message}`);
  console.log(`  - 국내 종목 ${KR_STOCKS.length}개 추가`);

  const { error: e6 } = await supabase.from("manual_stocks").insert(usRows);
  if (e6) throw new Error(`해외 종목 삽입 실패: ${e6.message}`);
  console.log(`  - 해외 종목 ${US_STOCKS.length}개 추가`);

  // 4. 리밸런싱 설정
  console.log("\n[4/4] 리밸런싱 설정...");
  const { error: e7 } = await supabase.from("rebalance_settings").upsert(
    {
      user_id: USER_ID,
      data_source: "manual",
      strategy: "threshold",
      threshold_pct: 5,
    },
    { onConflict: "user_id" }
  );
  if (e7) throw new Error(`리밸런싱 설정 실패: ${e7.message}`);
  console.log("  - threshold 5% 설정 완료");

  // 요약
  console.log("\n=== 완료 ===");
  console.log(`계좌: ${ACCOUNTS.length}개`);
  console.log(`종목: ${KR_STOCKS.length + US_STOCKS.length}개`);

  console.log("\n[국내 증권] cash 3,200,000원");
  for (const s of KR_STOCKS) {
    const val = s.quantity * s.current_price;
    const pnl = ((s.current_price - s.avg_price) / s.avg_price * 100).toFixed(1);
    console.log(`  ${s.stock_name.padEnd(10)} ${s.quantity}주 × ${s.current_price.toLocaleString()}원 = ${val.toLocaleString()}원 (${pnl > 0 ? '+' : ''}${pnl}%) → 목표 ${s.target_pct}%`);
  }

  console.log("\n[해외 투자] cash 1,500,000원");
  for (const s of US_STOCKS) {
    const val = s.quantity * s.current_price;
    const pnl = ((s.current_price - s.avg_price) / s.avg_price * 100).toFixed(1);
    console.log(`  ${s.stock_name.padEnd(16)} ${s.quantity}주 × $${s.current_price} = $${val.toLocaleString()} (${pnl > 0 ? '+' : ''}${pnl}%) → 목표 ${s.target_pct}%`);
  }
}

run().catch((err) => {
  console.error("\n[ERROR]", err.message);
  process.exit(1);
});
