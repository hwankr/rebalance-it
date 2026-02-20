/**
 * 심사위원 데모 계정 생성 스크립트
 *
 * 바이브 코딩 대회 심사위원이 앱을 테스트할 수 있도록
 * Pro 플랜 계정 + 시연 데이터를 생성합니다.
 *
 * 사용법: node scripts/seed-judge-account.mjs
 *
 * 멱등성 보장: 여러 번 실행해도 안전합니다.
 * - 기존 유저가 있으면 재사용
 * - 기존 데이터 삭제 후 재생성
 */

import { createClient } from "@supabase/supabase-js";

// ── 설정 ─────────────────────────────────────────────────
const SUPABASE_URL = "https://cachtwsbytobktzuejkr.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhY2h0d3NieXRvYmt0enVlamtyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg4NjQ4NywiZXhwIjoyMDg2NDYyNDg3fQ.JxtgvRNa1T_gDM8adlIKpaaaI57Foaof5YuSES8ONzM";

const JUDGE_EMAIL = "test@rebalance-it.com";
const JUDGE_PASSWORD = "test1234";

const APP_URL = "https://rebalance-it.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── 포트폴리오 데이터 ────────────────────────────────────

const ACCOUNTS = [
  { name: "국내 증권", cash: 3200000, display_order: 0 },
  { name: "해외 투자", cash: 1500000, display_order: 1 },
];

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

// ── 실행 이력 데이터 ─────────────────────────────────────

function buildExecutionHistory(krPortfolioId, usPortfolioId) {
  const now = new Date();

  // 실행 이력 1: 국내 증권 - 7일 전 완료
  const exec1Date = new Date(now);
  exec1Date.setDate(exec1Date.getDate() - 7);
  const exec1Orders = [
    {
      stock_code: "005930",
      stock_name: "삼성전자",
      side: "buy",
      quantity: 5,
      estimated_price: 58000,
      estimated_amount: 290000,
      success: true,
      executed: true,
      executed_at: exec1Date.toISOString(),
      executed_quantity: 5,
      currency: "KRW",
    },
    {
      stock_code: "035720",
      stock_name: "카카오",
      side: "sell",
      quantity: 10,
      estimated_price: 39000,
      estimated_amount: 390000,
      success: true,
      executed: true,
      executed_at: exec1Date.toISOString(),
      executed_quantity: 10,
      currency: "KRW",
    },
  ];

  // 실행 이력 2: 해외 투자 - 4일 전 완료
  const exec2Date = new Date(now);
  exec2Date.setDate(exec2Date.getDate() - 4);
  const exec2Orders = [
    {
      stock_code: "AAPL",
      stock_name: "Apple Inc.",
      side: "sell",
      quantity: 1,
      estimated_price: 232,
      estimated_amount: 232,
      success: true,
      executed: true,
      executed_at: exec2Date.toISOString(),
      executed_quantity: 1,
      currency: "USD",
    },
    {
      stock_code: "NVDA",
      stock_name: "NVIDIA CORP",
      side: "buy",
      quantity: 2,
      estimated_price: 138,
      estimated_amount: 276,
      success: true,
      executed: true,
      executed_at: exec2Date.toISOString(),
      executed_quantity: 2,
      currency: "USD",
    },
  ];

  // 실행 이력 3: 국내 증권 - 1일 전 부분 완료
  const exec3Date = new Date(now);
  exec3Date.setDate(exec3Date.getDate() - 1);
  const exec3Orders = [
    {
      stock_code: "000660",
      stock_name: "SK하이닉스",
      side: "sell",
      quantity: 2,
      estimated_price: 197000,
      estimated_amount: 394000,
      success: true,
      executed: true,
      executed_at: exec3Date.toISOString(),
      executed_quantity: 2,
      currency: "KRW",
    },
    {
      stock_code: "373220",
      stock_name: "LG에너지솔루션",
      side: "buy",
      quantity: 1,
      estimated_price: 408000,
      estimated_amount: 408000,
      success: false,
      executed: false,
      currency: "KRW",
    },
  ];

  return [
    {
      portfolio_id: krPortfolioId,
      profile_name: "국내 증권",
      type: "execution",
      status: "completed",
      executed_at: exec1Date.toISOString(),
      started_at: exec1Date.toISOString(),
      completed_at: exec1Date.toISOString(),
      total_orders: 2,
      success_count: 2,
      fail_count: 0,
      total_buy_amount: 290000,
      total_sell_amount: 390000,
      net_cash_change: 100000,
      orders: exec1Orders,
      portfolio_snapshot: {
        stocks: KR_STOCKS.map((s) => ({
          stock_code: s.stock_code,
          stock_name: s.stock_name,
          quantity: s.quantity,
          price: s.current_price,
        })),
        cash: 3200000,
        exchange_rate: 1450,
        captured_at: exec1Date.toISOString(),
      },
    },
    {
      portfolio_id: usPortfolioId,
      profile_name: "해외 투자",
      type: "execution",
      status: "completed",
      executed_at: exec2Date.toISOString(),
      started_at: exec2Date.toISOString(),
      completed_at: exec2Date.toISOString(),
      total_orders: 2,
      success_count: 2,
      fail_count: 0,
      total_buy_amount: 276,
      total_sell_amount: 232,
      net_cash_change: -44,
      orders: exec2Orders,
      portfolio_snapshot: {
        stocks: US_STOCKS.map((s) => ({
          stock_code: s.stock_code,
          stock_name: s.stock_name,
          quantity: s.quantity,
          price: s.current_price,
        })),
        cash: 1500000,
        exchange_rate: 1450,
        captured_at: exec2Date.toISOString(),
      },
    },
    {
      portfolio_id: krPortfolioId,
      profile_name: "국내 증권",
      type: "execution",
      status: "partial",
      executed_at: exec3Date.toISOString(),
      started_at: exec3Date.toISOString(),
      completed_at: exec3Date.toISOString(),
      total_orders: 2,
      success_count: 1,
      fail_count: 1,
      total_buy_amount: 0,
      total_sell_amount: 394000,
      net_cash_change: 394000,
      orders: exec3Orders,
      portfolio_snapshot: {
        stocks: KR_STOCKS.map((s) => ({
          stock_code: s.stock_code,
          stock_name: s.stock_name,
          quantity: s.quantity,
          price: s.current_price,
        })),
        cash: 3300000,
        exchange_rate: 1450,
        captured_at: exec3Date.toISOString(),
      },
    },
  ];
}

// ── 메인 실행 ────────────────────────────────────────────

async function run() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   심사위원 데모 계정 생성 스크립트               ║");
  console.log("║   Vibe Coding Competition - Judge Account        ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Step 1: Auth 유저 생성 ──
  console.log("[1/7] Auth 유저 생성 중...");

  let userId;

  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email: JUDGE_EMAIL,
      password: JUDGE_PASSWORD,
      email_confirm: true,
    });

  if (createError) {
    if (
      createError.message.includes("already been registered") ||
      createError.message.includes("already exists")
    ) {
      console.log("  - 기존 유저 발견, 재사용합니다.");
      const {
        data: { users },
        error: listError,
      } = await supabase.auth.admin.listUsers();
      if (listError) throw new Error(`유저 목록 조회 실패: ${listError.message}`);

      const existing = users.find((u) => u.email === JUDGE_EMAIL);
      if (!existing) throw new Error("유저를 찾을 수 없습니다.");
      userId = existing.id;

      // 비밀번호 재설정 (변경되었을 수 있으므로)
      await supabase.auth.admin.updateUserById(userId, {
        password: JUDGE_PASSWORD,
      });
      console.log("  - 비밀번호 재설정 완료");
    } else {
      throw new Error(`유저 생성 실패: ${createError.message}`);
    }
  } else {
    userId = createData.user.id;
    console.log(`  - 새 유저 생성 완료 (${userId})`);
  }

  // ── Step 2: Pro 구독 등록 ──
  console.log("\n[2/7] Pro 구독 등록 중...");

  // delete-then-insert (partial unique index 때문에 upsert 불가)
  const { error: delSubErr } = await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", userId);
  if (delSubErr) console.warn(`  - 기존 구독 삭제 경고: ${delSubErr.message}`);

  const { error: subErr } = await supabase.from("subscriptions").insert({
    user_id: userId,
    plan_tier: "pro",
    status: "active",
    billing_cycle: "yearly",
    current_period_start: new Date().toISOString(),
    current_period_end: "2027-01-01T00:00:00.000Z",
  });
  if (subErr) throw new Error(`구독 등록 실패: ${subErr.message}`);
  console.log("  - Pro 플랜 (yearly, ~2027-01-01) 등록 완료");

  // ── Step 3: 기존 데이터 정리 ──
  console.log("\n[3/7] 기존 데이터 정리 중...");

  // FK-safe 순서: executions → manual_stocks → manual_portfolios → rebalance_settings
  const { error: e1 } = await supabase
    .from("executions")
    .delete()
    .eq("user_id", userId);
  if (e1) throw new Error(`executions 삭제 실패: ${e1.message}`);
  console.log("  - executions 삭제 완료");

  const { data: oldPortfolios } = await supabase
    .from("manual_portfolios")
    .select("id")
    .eq("user_id", userId);

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
    .eq("user_id", userId);
  if (e3) throw new Error(`manual_portfolios 삭제 실패: ${e3.message}`);
  console.log("  - manual_portfolios 삭제 완료");

  const { error: e4 } = await supabase
    .from("rebalance_settings")
    .delete()
    .eq("user_id", userId);
  if (e4) throw new Error(`rebalance_settings 삭제 실패: ${e4.message}`);
  console.log("  - rebalance_settings 삭제 완료");

  // ── Step 4: 포트폴리오 + 종목 시드 ──
  console.log("\n[4/7] 포트폴리오 생성 중...");
  const portfolioIds = [];

  for (const acct of ACCOUNTS) {
    const { data, error } = await supabase
      .from("manual_portfolios")
      .insert({
        user_id: userId,
        name: acct.name,
        cash: acct.cash,
        display_order: acct.display_order,
      })
      .select("id")
      .single();
    if (error)
      throw new Error(`계좌 "${acct.name}" 생성 실패: ${error.message}`);
    portfolioIds.push(data.id);
    console.log(
      `  - "${acct.name}" 생성 (cash: ${acct.cash.toLocaleString()}원)`,
    );
  }

  console.log("\n[5/7] 종목 추가 중...");
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

  // ── Step 5: 실행 이력 시드 ──
  console.log("\n[6/7] 리밸런싱 실행 이력 추가 중...");

  const executions = buildExecutionHistory(portfolioIds[0], portfolioIds[1]);

  for (const exec of executions) {
    const { error } = await supabase.from("executions").insert({
      user_id: userId,
      ...exec,
    });
    if (error)
      throw new Error(
        `실행 이력 (${exec.profile_name} / ${exec.status}) 삽입 실패: ${error.message}`,
      );
    console.log(
      `  - ${exec.profile_name} (${exec.status}, ${exec.total_orders}건) 추가`,
    );
  }

  // ── Step 6: 리밸런싱 설정 ──
  console.log("\n[7/7] 리밸런싱 설정 중...");
  const { error: e7 } = await supabase.from("rebalance_settings").upsert(
    {
      user_id: userId,
      data_source: "manual",
      strategy: "threshold",
      threshold_pct: 5,
    },
    { onConflict: "user_id" },
  );
  if (e7) throw new Error(`리밸런싱 설정 실패: ${e7.message}`);
  console.log("  - threshold 5% 설정 완료");

  // ── 결과 출력 ──
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   ✅ 심사위원 계정 생성 완료!                    ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  🌐 URL:      ${APP_URL}/login`);
  console.log(`║  📧 이메일:   ${JUDGE_EMAIL}`);
  console.log(`║  🔑 비밀번호: ${JUDGE_PASSWORD}`);
  console.log(`║  ⭐ 플랜:     Pro (모든 기능 사용 가능)`);
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  📊 시드 데이터 요약                             ║");
  console.log(`║  - 포트폴리오: ${ACCOUNTS.length}개 (국내 증권 / 해외 투자)`);
  console.log(`║  - 종목: ${KR_STOCKS.length + US_STOCKS.length}개 (KR ${KR_STOCKS.length}개 + US ${US_STOCKS.length}개)`);
  console.log(`║  - 리밸런싱 이력: ${executions.length}건`);
  console.log("║  - 리밸런싱 전략: threshold 5%");
  console.log("╚══════════════════════════════════════════════════╝");

  console.log("\n[국내 증권] cash 3,200,000원");
  for (const s of KR_STOCKS) {
    const val = s.quantity * s.current_price;
    const pnl = (
      ((s.current_price - s.avg_price) / s.avg_price) *
      100
    ).toFixed(1);
    console.log(
      `  ${s.stock_name.padEnd(10)} ${s.quantity}주 × ${s.current_price.toLocaleString()}원 = ${val.toLocaleString()}원 (${pnl > 0 ? "+" : ""}${pnl}%) → 목표 ${s.target_pct}%`,
    );
  }

  console.log("\n[해외 투자] cash 1,500,000원");
  for (const s of US_STOCKS) {
    const val = s.quantity * s.current_price;
    const pnl = (
      ((s.current_price - s.avg_price) / s.avg_price) *
      100
    ).toFixed(1);
    console.log(
      `  ${s.stock_name.padEnd(16)} ${s.quantity}주 × $${s.current_price} = $${val.toLocaleString()} (${pnl > 0 ? "+" : ""}${pnl}%) → 목표 ${s.target_pct}%`,
    );
  }
}

run().catch((err) => {
  console.error("\n[ERROR]", err.message);
  process.exit(1);
});
