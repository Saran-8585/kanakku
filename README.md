# kanakku

Personal finance control center — cashflow, investments, debts and tax, derived from a single transaction stream.

> **Design principle:** one event stream, everything derived. Every module (cashflow, portfolio, debt, tax, net worth) is a projection of the same normalized money events. Enter a transaction once; all views update.

See [`docs/APP_UX_FLOW.md`](docs/APP_UX_FLOW.md) for the full in-app workflow and navigation diagrams.

## Stack

| Layer | Tech |
|-------|------|
| Web | React 19 + Vite + TypeScript + TailwindCSS v4 · React Router · TanStack Query · Recharts |
| Server | Node + Express + TypeScript · Prisma ORM · PostgreSQL · JWT auth · Zod validation |
| Tests | Vitest (server unit tests) |

## Layout

```
kanakku/
├── server/          Express API + Prisma schema + tax engine
│   ├── prisma/      schema.prisma, migrations, seed.ts
│   └── src/
│       ├── lib/         prisma client, jwt, http helpers
│       ├── middleware/  requireAuth
│       └── modules/
│           ├── auth/         register / login / me
│           ├── accounts/     bank, wallet, card, invest accounts
│           ├── categories/   built-in + custom categories
│           ├── transactions/ the unified stream (CRUD)
│           ├── finance/      cashflow projections
│           ├── invest/       assets, FIFO lots, portfolio
│           ├── debt/         loans, EMI amortization, payoff projection
│           ├── tax/          India tax engine + workspace
│           └── dashboard/    overview (net worth) + cashflow
└── web/             React SPA
    └── src/
        ├── api/         fetch client + types
        ├── context/     auth
        ├── components/  layout, nav, transaction modal
        └── pages/       login, home, cashflow, invest, debts, tax, settings
```

## Getting started

### 1. Database

Either use a local PostgreSQL, or spin one up with Docker (mapped to host port **5433** to avoid clashing with a local install):

```bash
docker compose up -d
# then set DATABASE_URL to:
# postgresql://kanakku:kanakku@localhost:5433/kanakku
```

The default `server/.env` points at `localhost:5432` with user/password/db `kanakku`.

### 2. Install

```bash
pnpm install
```

### 3. Migrate + seed

```bash
pnpm --filter server exec prisma migrate deploy
pnpm --filter server run prisma:seed
```

Demo login: **demo@kanakku.app / demo1234**

### 4. Run

```bash
pnpm dev            # starts server (:4000) + web (Vite, :5173 or next free port)
```

- API: http://localhost:4000
- Web: http://localhost:5173 (Vite proxies `/api` → :4000)

## Scripts

```bash
pnpm dev            # run both apps
pnpm test           # server unit tests (amortization, FIFO, tax slabs)
pnpm lint           # eslint (server) + oxlint (web)
pnpm typecheck      # tsc for both
pnpm build          # build both
pnpm db:up / db:down
```

## What's implemented (MVP)

- Email/password auth, JWT sessions
- Accounts, categories, unified transaction stream (income / expense / transfer / loan payment / tax paid)
- Cashflow dashboard: income vs expense, savings rate, category breakdown, 6-month chart
- Investments: assets, FIFO lot accounting, buy/sell, unrealized gains, allocation
- Debts: loans with reducing-balance EMI, amortization schedule, extra-payment payoff projection
- Net worth overview (assets − liabilities)
- India tax workspace: slab estimate (new regime), 80C/80D caps, STCG/LTCG on realized gains, TDS offset, refund/dues

## Not yet (post-MVP)

CSV/bank import, automated price sync, multi-currency, budgets, recurring entries, other tax jurisdictions, filing forms/26AS, PWA offline.
