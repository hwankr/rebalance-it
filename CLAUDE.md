# Rebalance-it

Portfolio rebalancing simulation & guide tool. Manual portfolio is the primary mode.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Runtime**: React 19.2.3, TypeScript (strict)
- **Styling**: Tailwind CSS v4, tw-animate-css, framer-motion
- **UI**: shadcn/ui (Radix UI), cmdk, lucide-react, recharts, sonner
- **State**: TanStack React Query v5
- **Forms**: react-hook-form + zod v4
- **Auth & DB**: Supabase (SSR client via @supabase/ssr)
- **Payments**: PortOne
- **Theme**: next-themes (dark/light)

## Commands

```bash
npm run dev      # Next.js dev server
npm run build    # Production build
npm run lint     # ESLint
```

No test framework configured yet.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (lang="ko", Providers, Toaster)
│   ├── page.tsx                # Landing / redirect
│   ├── (auth)/login/           # Login
│   ├── (dashboard)/            # Dashboard (Sidebar + Header + BottomNav)
│   │   ├── portfolio/          # Portfolio overview
│   │   ├── manual-portfolio/    # Portfolio management (add/edit stocks)
│   │   ├── rebalance/          # Simulation & guide
│   │   │   ├── simulate/
│   │   │   └── guide/
│   │   ├── settings/           # Settings (exchange rate, etc.)
│   │   └── history/            # Rebalancing records
│   ├── pricing/                # Pricing page
│   └── api/
│       ├── stocks/             # Stock list, current price, chart data (Yahoo Finance)
│       ├── rebalance/          # Rebalancing calculate
│       ├── portone/            # Payments (checkout, webhook, cancel)
│       ├── subscription/       # Subscription management
│       └── health/, setup/     # Health checks
├── components/
│   ├── ui/                     # shadcn base components
│   ├── layout/                 # sidebar, header, nav, bottom-nav, page-transition
│   ├── portfolio/              # allocation-chart, summary-cards, stock-price-chart, holdings-table
│   ├── rebalance/              # drift-chart, order-preview
│   ├── subscription/           # plan-gate, plan-badge, upgrade-prompt
│   ├── manual-portfolio/       # stock-form, stock-table
│   ├── stock-combobox.tsx      # Stock search autocomplete
│   └── providers.tsx           # QueryClient, ThemeProvider
├── hooks/
│   ├── use-auth.ts             # Supabase auth
│   ├── use-settings.ts         # User settings (account)
│   ├── use-profiles.ts         # Rebalancing profiles
│   ├── use-portfolio-data.ts   # Portfolio data (always manual mode)
│   ├── use-manual-portfolio.ts # Manual portfolio management
│   ├── use-rebalance.ts        # Rebalancing simulation
│   ├── use-rebalance-settings.ts # Rebalancing settings (threshold, strategy)
│   ├── use-history.ts          # Rebalancing records
│   ├── use-subscription.ts     # Subscription state
│   ├── use-stock-search.ts     # Stock search
│   ├── use-stock-list.ts       # Stock list
│   ├── use-stock-chart.ts      # Chart data (Yahoo Finance)
│   └── use-theme-colors.ts     # Theme colors
├── lib/
│   ├── supabase/               # Supabase client (client, server, middleware, auth, types)
│   ├── rebalance/              # Rebalancing engine (calculator, drift, order-generator, price-unit, helpers, types)
│   ├── subscription/           # Subscription system (plans, guard)
│   ├── stock-price.ts          # Stock price + chart utility (Yahoo Finance)
│   └── utils/                  # Formatting utilities
└── middleware.ts               # Supabase auth middleware

supabase/migrations/            # DB schema (001~016)
```

## Path Alias

`@/*` → `./src/*`

## Conventions

- Korean UI (html lang="ko")
- Mobile-responsive: Desktop (Sidebar) / Mobile (BottomNav + Header)
- API routes under `src/app/api/` in RESTful structure
- Supabase client: `server.ts` for server components, `client.ts` for client components
- shadcn components live in `src/components/ui/`
- Custom hooks in `src/hooks/` with `use-*.ts` naming pattern
- Business logic in `src/lib/` organized by domain folders

## Environment Variables

See `.env.example`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase server only

## Key Features

1. **Manual Portfolio**: Enter stocks/quantities manually, set target weights
2. **Rebalancing Simulation**: Drift calculation against target weights, order generation
3. **Rebalancing Guide**: Step-by-step guide for manual trading (sell first, then buy)
4. **Stock Price Chart**: Historical OHLCV chart via Yahoo Finance (KR/US stocks)
5. **Stock Search**: Autocomplete + live price refresh (KR/US stocks)
6. **Subscription System**: PortOne payments, feature gating
7. **Exchange Rate Management**: Manual setting + last refresh timestamp

## External Model Consultation Workflow

Claude는 ask_codex/ask_gemini MCP 도구를 자동으로 호출하지 않는다.
대신, 외부 모델의 의견이 필요할 때 사용자에게 질문 템플릿을 제공하고 사용자가 직접 외부 모델에 질문한다.

### 워크플로우

1. 작업 중 외부 모델 의견이 유용한 상황이 발생하면, Claude가 질문 템플릿을 작성하여 제시한다.
2. 사용자가 해당 질문을 복사하여 Codex(ChatGPT) 또는 Gemini에 직접 질문한다.
3. 사용자가 답변을 채팅에 붙여넣거나, `.md` 파일로 저장 후 경로를 알려준다.
4. Claude가 답변을 분석하여 코드에 반영한다.

### 질문 템플릿 형식

```
**대상 모델**: Codex(ChatGPT) 또는 Gemini
**질문 목적**: (예: 아키텍처 리뷰, UI 개선안, 코드 리뷰)
**컨텍스트**: 관련 코드/파일 내용
**질문**: 구체적인 질문 내용
```

### 모델별 추천 용도

| 상황 | 추천 모델 | 이유 |
|------|----------|------|
| 설계/아키텍처 결정 | Codex (ChatGPT) | 코드 구조 분석, 로직 검증에 강함 |
| 코드 리뷰/버그 분석 | Codex (ChatGPT) | 논리적 결함 탐지에 강함 |
| UI/UX 개선/디자인 리뷰 | Gemini | 디자인 감각, 대용량 컨텍스트(1M 토큰) |
| 대규모 리팩토링 방향 | 둘 다 | 두 모델의 의견을 비교하여 최선안 선택 |
| 문서 작성/정리 | Gemini | 자연어 생성 품질 우수 |

### Claude가 질문 템플릿을 제시해야 하는 상황

- 아키텍처/설계 방향에 대한 선택지가 2개 이상일 때
- UI/UX 변경이 사용자 경험에 큰 영향을 줄 때
- 복잡한 비즈니스 로직 리뷰가 필요할 때
- 성능 최적화 전략을 결정해야 할 때
- 보안 관련 코드를 변경할 때
