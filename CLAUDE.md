# Rebalance-it

Portfolio rebalancing tool powered by the Kiwoom Securities REST API. Also supports manual portfolio mode.

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
│   │   ├── profiles/           # Rebalancing profile CRUD
│   │   ├── rebalance/          # Simulation & execution
│   │   │   ├── simulate/
│   │   │   └── execute/
│   │   ├── settings/           # Settings (Kiwoom API keys, exchange rate, etc.)
│   │   └── history/            # Rebalancing history
│   ├── pricing/                # Pricing page
│   └── api/
│       ├── kiwoom/             # Kiwoom API proxy (balance, token, order, stock, chart)
│       ├── stocks/             # Stock list & current price lookup
│       ├── rebalance/          # Rebalancing calculate & execute
│       ├── portone/            # Payments (checkout, webhook, cancel)
│       ├── subscription/       # Subscription management
│       └── health/, setup/     # Health checks
├── components/
│   ├── ui/                     # shadcn base components
│   ├── layout/                 # sidebar, header, nav, bottom-nav, page-transition
│   ├── portfolio/              # allocation-chart, summary-cards, stock-price-chart
│   ├── rebalance/              # profile-form, drift-chart
│   ├── subscription/           # plan-gate, plan-badge, upgrade-prompt
│   ├── manual-portfolio/       # stock-form
│   ├── stock-combobox.tsx      # Stock search autocomplete
│   └── providers.tsx           # QueryClient, ThemeProvider
├── hooks/
│   ├── use-auth.ts             # Supabase auth
│   ├── use-settings.ts         # User settings (Kiwoom API keys, exchange rate)
│   ├── use-profiles.ts         # Rebalancing profiles
│   ├── use-portfolio.ts        # Kiwoom portfolio
│   ├── use-portfolio-data.ts   # Portfolio data aggregation
│   ├── use-manual-portfolio.ts # Manual portfolio
│   ├── use-rebalance.ts        # Rebalancing logic
│   ├── use-history.ts          # Execution history
│   ├── use-subscription.ts     # Subscription state
│   ├── use-stock-search.ts     # Stock search
│   ├── use-stock-list.ts       # Stock list
│   ├── use-stock-chart.ts      # Chart data
│   ├── use-execution-data.ts   # Execution data
│   └── use-theme-colors.ts     # Theme colors
├── lib/
│   ├── kiwoom/                 # Kiwoom REST API client (client, auth, types, constants, errors)
│   ├── supabase/               # Supabase client (client, server, middleware, auth, types)
│   ├── rebalance/              # Rebalancing engine (calculator, drift, order-generator, price-unit, helpers, types)
│   ├── subscription/           # Subscription system (plans, guard)
│   ├── stock-price.ts          # Stock price utility
│   └── utils/                  # Formatting utilities
└── middleware.ts               # Supabase auth middleware

supabase/migrations/            # DB schema (001~006)
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
- `KIWOOM_APP_KEY`, `KIWOOM_APP_SECRET`, `KIWOOM_BASE_URL` — Kiwoom REST API
- `KIWOOM_PROXY_URL` — Fixed-IP proxy (optional)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase server only

## Key Features

1. **Kiwoom API Integration**: Balance inquiry, order execution, stock quotes
2. **Manual Portfolio**: Enter stocks/quantities manually without Kiwoom API
3. **Rebalancing Engine**: Drift calculation against target weights, order generation
4. **Stock Search**: Autocomplete + live price refresh (KR/US stocks)
5. **Subscription System**: PortOne payments, feature gating
6. **Exchange Rate Management**: Manual setting + last refresh timestamp

## Codex Collaboration (GPT Pro)

- **ALWAYS maximize Codex (`ask_codex`) usage.** User has GPT Pro plan with generous limits — no cost concerns, use liberally.
- Run Codex in background (`background: true`) when possible for parallel work.
- Always attach relevant `context_files` for better analysis quality.
- Codex is read-only (analysis/review); actual code writing/editing is done by Claude.

### Design Partner Pattern

- **Consult Codex before major design decisions**: For architecture, DB schema, API design, and other critical decisions, always seek Codex architect/critic opinion BEFORE implementation.
- **Cross-validation loop**: Claude proposes → Codex critic critiques → Claude incorporates feedback → finalize. The higher the stakes, the more strictly this loop must be followed.
- **Multi-role parallel review**: For complex tasks, invoke Codex in multiple roles simultaneously (e.g., architect + critic + security-reviewer) to get multi-angle feedback.

### Auto Review Pattern

- **Automatic Codex code review after implementation**: After meaningful code changes (5+ files or core logic changes), automatically run Codex code-reviewer.
- **Mandatory security review for sensitive code**: Authentication, authorization, payments (PortOne), and personal data handling code must always pass through Codex security-reviewer.

### Scope of Use

- Architecture review, planning validation, code review, security review, critical analysis, test strategy, debugging analysis, second-opinion checks.
- For complex bug analysis, attach relevant files to Codex debugger/analyst and collaboratively identify root causes.
