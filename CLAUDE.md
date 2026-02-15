# Rebalance-it

Portfolio rebalancing simulation & guide tool. Manual portfolio is the primary mode; Kiwoom Securities REST API is available as a read-only portfolio import feature (Pro only).

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
│   │   ├── presets/             # Rebalancing preset CRUD
│   │   ├── rebalance/          # Simulation & guide
│   │   │   ├── simulate/
│   │   │   └── guide/
│   │   ├── settings/           # Settings (Kiwoom API keys, exchange rate, etc.)
│   │   └── history/            # Rebalancing records
│   ├── pricing/                # Pricing page
│   └── api/
│       ├── kiwoom/             # Kiwoom API proxy (balance, token, stock, chart — read-only)
│       ├── stocks/             # Stock list & current price lookup
│       ├── rebalance/          # Rebalancing calculate
│       ├── portone/            # Payments (checkout, webhook, cancel)
│       ├── subscription/       # Subscription management
│       └── health/, setup/     # Health checks
├── components/
│   ├── ui/                     # shadcn base components
│   ├── layout/                 # sidebar, header, nav, bottom-nav, page-transition
│   ├── portfolio/              # allocation-chart, summary-cards, stock-price-chart
│   ├── rebalance/              # drift-chart, order-preview
│   ├── subscription/           # plan-gate, plan-badge, upgrade-prompt
│   ├── manual-portfolio/       # stock-form
│   ├── stock-combobox.tsx      # Stock search autocomplete
│   └── providers.tsx           # QueryClient, ThemeProvider
├── hooks/
│   ├── use-auth.ts             # Supabase auth
│   ├── use-settings.ts         # User settings (account, connection status)
│   ├── use-profiles.ts         # Rebalancing profiles
│   ├── use-portfolio.ts        # Kiwoom portfolio (read-only import)
│   ├── use-portfolio-data.ts   # Portfolio data (always manual mode)
│   ├── use-manual-portfolio.ts # Manual portfolio management
│   ├── use-rebalance.ts        # Rebalancing simulation
│   ├── use-rebalance-settings.ts # Rebalancing settings (threshold, strategy)
│   ├── use-history.ts          # Rebalancing records
│   ├── use-subscription.ts     # Subscription state
│   ├── use-stock-search.ts     # Stock search
│   ├── use-stock-list.ts       # Stock list
│   ├── use-stock-chart.ts      # Chart data
│   └── use-theme-colors.ts     # Theme colors
├── lib/
│   ├── kiwoom/                 # Kiwoom REST API client — read-only (client, auth, types, constants, errors)
│   ├── supabase/               # Supabase client (client, server, middleware, auth, types)
│   ├── rebalance/              # Rebalancing engine (calculator, drift, order-generator, price-unit, helpers, types)
│   ├── subscription/           # Subscription system (plans, guard)
│   ├── stock-price.ts          # Stock price utility
│   └── utils/                  # Formatting utilities
└── middleware.ts               # Supabase auth middleware

supabase/migrations/            # DB schema (001~008)
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

1. **Manual Portfolio**: Enter stocks/quantities manually, set target weights
2. **Rebalancing Simulation**: Drift calculation against target weights, order generation
3. **Rebalancing Guide**: Step-by-step guide for manual trading (sell first, then buy)
4. **Kiwoom API Import (Pro)**: Read-only portfolio import from Kiwoom Securities
5. **Stock Search**: Autocomplete + live price refresh (KR/US stocks)
6. **Subscription System**: PortOne payments, feature gating
7. **Exchange Rate Management**: Manual setting + last refresh timestamp
8. **Rebalancing Presets**: Save and load target allocation presets

## Codex Collaboration (GPT Pro)

- Use Codex (`ask_codex`) for high-value analysis: architecture, security, planning validation, critical review.
- User has GPT Pro plan — cost is not a concern, but **TPM (tokens per minute) rate limit** must be respected.
- Codex uses `xhigh` reasoning effort — each call consumes very high token volume.
- Codex is read-only (analysis/review); actual code writing/editing is done by Claude.

### Rate Limit Rules (CRITICAL)

- **NEVER run Codex calls in parallel.** Always sequential, one at a time. No `background: true`.
- **Limit `context_files` to 3 files max**, prioritizing the most relevant ones.
- **Multi-role reviews must be sequential**: architect first → wait → critic → wait → security-reviewer.
- If a Codex call fails with rate limit, wait 60+ seconds before retrying.

### Design Partner Pattern

- **Consult Codex before major design decisions**: For architecture, DB schema, API design, and other critical decisions, seek Codex architect/critic opinion BEFORE implementation.
- **Cross-validation loop**: Claude proposes → Codex critiques → Claude incorporates → finalize. Each Codex call sequential.
- **Multi-role review**: For complex tasks, invoke Codex in multiple roles **sequentially** (architect → critic → security-reviewer), not in parallel.

### Auto Review Pattern

- **Codex code review after implementation**: After meaningful code changes (5+ files or core logic changes), run Codex code-reviewer.
- **Mandatory security review for sensitive code**: Authentication, authorization, payments (PortOne), and personal data handling code must pass through Codex security-reviewer.
- Run code-review and security-review **sequentially**, not in parallel.

### When NOT to Use Codex (Use Claude Agents Instead)

- Simple file exploration, codebase search, symbol lookup
- Build error fixes, lint fixes, straightforward bug fixes
- Small refactors (<3 files), simple feature additions

### Scope of Use

- Architecture review, planning validation, code review, security review, critical analysis, test strategy, debugging analysis.
- For complex bug analysis, attach relevant files to Codex debugger/analyst and collaboratively identify root causes.
