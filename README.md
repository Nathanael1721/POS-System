# Simple-POS

Production-grade **Point of Sale (POS)** web application for small retail stores —
product management, order processing, payment recording, and sales reporting.

**Versi terkini: v1.5.0** — Dukungan Deploy Serverless (Vercel + Supabase + Upstash).
Riwayat lengkap per versi: [CHANGELOG.md](CHANGELOG.md) ·
Panduan deploy: [DEPLOYMENT.md](DEPLOYMENT.md) ·
Roadmap: [docs/18-development-roadmap](docs/18-development-roadmap.md)

Monorepo (Turborepo) with TypeScript everywhere:

| Package              | Stack                                   | Purpose                          |
| -------------------- | --------------------------------------- | -------------------------------- |
| `apps/web`           | Next.js 14 (App Router), Tailwind       | Cashier terminal + owner dashboard |
| `apps/api`           | Hono + Node, postgres.js (raw SQL), JWT | REST backend                     |
| `packages/shared`    | Zod schemas + TypeScript types          | Shared contract between web & api |

## Features

- **Auth** — email/password login, JWT access (15m) + refresh (7d, rotated in Redis), RBAC.
- **Products / categories** — CRUD, SKU, price, stock, images, barcode; **soft-delete**
  (product history stays intact).
- **Orders** — atomic order processing with stock deduction, discount/tax, payment + change;
  **void/cancel with reason** — stock restored, audited.
- **Receipts** — JSON receipt per order; browser print, reprint from history,
  optional auto-print after checkout (per-store setting).
- **Reports** — daily/weekly/monthly/**yearly** summaries with **historical period
  navigation**, revenue trend chart, top-5 products, and **CSV export** (owner only).
- **Dashboard (owner)** — today's sales, running shifts, low-stock watchlist in one screen.
- **Audit log** — every state-changing action recorded with user, store, IP, and a JSON
  snapshot — plus an **owner-only viewer** with filtering.
- **Cashier workflow** — barcode scan-to-add, category quick chips, hold/park cart,
  numeric keypad for cash, keyboard shortcuts (F2/F4/F8), quick-cash buttons.
- **Shifts & cash drawer** (optional per store) — open/close with opening cash, cash
  in/out movements, end-of-shift reconciliation.
- **Store settings** — default tax %, low-stock threshold, auto-print receipt, shift toggle.
- **Responsive & resilient** — mobile drawer navigation + bottom-sheet cart; global
  error boundary; skeleton loading states; UI in Bahasa Indonesia.

## Roles

- `owner` — full access.
- `cashier` — process orders, view own orders only; no products write / no reports.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up -d postgres redis        # start data services
docker compose run --rm migrate            # apply migrations + seed
docker compose up api web                  # start the apps
```

- Web:  http://localhost:3100
- API:  http://localhost:3001  (health: `/health`)

### Demo logins (from seed)

| Role    | Email                    | Password     |
| ------- | ------------------------ | ------------ |
| Owner   | `owner@Simple-POS.test`   | `Owner123!`  |
| Cashier | `cashier@Simple-POS.test` | `Cashier123!`|

## Local development (without Docker)

```bash
pnpm install
# Provide DATABASE_URL + REDIS_URL in apps/api/.env (or root .env)
pnpm --filter @simplepos/api migrate
pnpm dev        # runs web + api via turbo
```

## Scripts

```bash
pnpm lint        # eslint across workspaces
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest unit tests
pnpm build       # turbo production build
```

## API surface

See `Task.md` for the original contract and [docs/16-api-design](docs/16-api-design.md)
for the full, current reference. Highlights:

```
POST   /api/auth/login | /refresh | /logout      GET /api/auth/me
GET/POST/PATCH/DELETE  /api/products             (DELETE = soft-delete)
GET/POST/DELETE        /api/categories
POST/GET               /api/orders               GET /api/orders/:id
POST                   /api/orders/:id/void      {reason} → cancel + restore stock
GET /api/reports/summary | /top-products | /trend | /export (CSV)
GET /api/audit-logs?page=&action=                (owner)
GET/PATCH /api/store                             (owner; tax/threshold/auto-print)
```

## Documentation & versioning

- **[CHANGELOG.md](CHANGELOG.md)** — every release, categorized (Added/Changed/Fixed).
- **[docs/](docs/README.md)** — 19 requirement + technical documents (Indonesian).
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — dev setup, conventions, testing, release process (SemVer).
- Design decisions: [docs/superpowers/specs](docs/superpowers/specs).

## CI/CD

- `.github/workflows/ci.yml` — lint → test → build → security (Snyk) on PRs to `main`.
- `.github/workflows/deploy.yml` — build & push image to GHCR, deploy staging on push to `main`,
  production on release (manual approval gate).
