# 02 — System Architecture

> **Status:** ✅ Terimplementasi
> **Ringkasan:** Monorepo Turborepo berbasis TypeScript dengan tiga workspace: frontend Next.js, backend Hono, dan paket kontrak bersama. Data layer memakai PostgreSQL (raw SQL via postgres.js) dan Redis.

---

## 1. Gambaran Umum

```
┌─────────────────────────────────────────────┐
│ Client (browser) — Next.js 14 (App Router)   │
│  Cashier UI · Owner dashboard · Products ·   │
│  Reports · Settings                          │
└───────────────┬─────────────────────────────┘
                │ HTTPS / REST (Bearer JWT)
┌───────────────▼─────────────────────────────┐
│ API — Hono (Node)                            │
│  Auth · Products · Categories · Orders ·     │
│  Reports · Users   (+ middleware)            │
└───────┬───────────────────────┬─────────────┘
        │                       │
┌───────▼────────┐      ┌───────▼─────────┐
│ PostgreSQL     │      │ Redis           │
│ data utama     │      │ refresh token + │
│ (postgres.js)  │      │ rate limit      │
└────────────────┘      └─────────────────┘
```

---

## 2. Struktur Monorepo

```
Simple-POS/
├── apps/
│   ├── web/        # Next.js 14 (App Router, Tailwind)
│   └── api/        # Hono backend (postgres.js, raw SQL)
├── packages/
│   └── shared/     # Zod schemas + tipe TypeScript bersama
├── docs/           # dokumentasi ini
├── docker-compose.yml
├── turbo.json
└── package.json    # root turborepo
```

- **`packages/shared`** menjadi _single source of truth_ untuk bentuk data: skema Zod (validasi) + tipe (`Product`, `Order`, dll). Dipakai kedua sisi web & api sehingga kontrak selalu sinkron.

---

## 3. Komponen Backend (apps/api)

| Lapisan | Folder | Tanggung jawab |
|---------|--------|----------------|
| **Entry** | `src/index.ts` | Bootstrap Hono, CORS, health check, wiring route, graceful shutdown |
| **Config** | `src/config/` | Validasi env (Zod), logger pino |
| **DB** | `src/db/` | Koneksi postgres.js (`client.ts`), Redis (`redis.ts`), migrasi |
| **Middleware** | `src/middleware/` | `auth`, `rbac`, `audit`, `rate-limit`, `validate`, `request-logger`, `error-handler` |
| **Services** | `src/services/` | Logika bisnis & SQL (auth, product, category, order, report, user) |
| **Routes** | `src/routes/` | Definisi endpoint per domain |
| **Utils** | `src/utils/` | `errors`, `jwt`, `money`, `order-number` |

**Aturan arsitektur:** SQL hanya ditulis di lapisan _service_, tidak di route handler. Semua query memakai _parameterized statement_ (tanpa interpolasi string).

---

## 4. Komponen Frontend (apps/web)

| Bagian | Lokasi | Isi |
|--------|--------|-----|
| **Routing** | `app/` | App Router: grup `(auth)` & `(dashboard)` |
| **Komponen** | `components/ui`, `components/pos`, `components/layout` | Primitif UI, komponen POS, layout |
| **Lib** | `lib/` | `api-client` (fetch + refresh otomatis), `auth` (token store), `utils` |
| **Hooks** | `hooks/` | `useCart`, `useProducts` |

Detail halaman: [17-ui-pages-and-navigation](17-ui-pages-and-navigation.md).

---

## 5. Data Layer

- **PostgreSQL** — penyimpanan utama. Akses via `postgres.js` (raw SQL, bukan ORM). DECIMAL dikembalikan sebagai string untuk menjaga presisi.
- **Redis** — penyimpanan refresh token (`refresh:{user_id}:{token_hash}`) dan penghitung rate limit. Bila Redis mati, rate limiter _fail-open_ (request tetap dilayani, error dicatat).

---

## 6. Observability

- ✅ **Logging** terstruktur (pino): tiap request mencatat `{ method, path, status, duration_ms, user_id, request_id }`.
- ✅ **Sentry** (stub) di backend & frontend, aktif bila `SENTRY_DSN` di-set.
- ✅ **Health check**: `GET /health` (liveness) & `GET /health/ready` (cek DB + Redis).

---

## 7. Multi-Environment & Deployment

| Environment | Web | API/DB |
|-------------|-----|--------|
| **Development** | lokal (`next dev`) | docker-compose: Postgres + Redis lokal |
| **Staging** 📅 | Vercel preview | Fly.io `simplepos-staging` |
| **Production** 📅 | Vercel | Fly.io `simplepos-prod` (approval gate) |

- CI: `.github/workflows/ci.yml` — lint → test → build → security (Snyk).
- CD: `.github/workflows/deploy.yml` — build image ke GHCR, deploy staging saat push `main`, production saat release (manual approval).
- Image API: multi-stage Dockerfile, berjalan sebagai non-root, `EXPOSE 3001`.

> Catatan: rencana database online memakai **Supabase** (PostgreSQL). Karena memakai raw SQL standar, perpindahan cukup mengganti `DATABASE_URL` lalu menjalankan migrasi. SSL diaktifkan otomatis saat `NODE_ENV=production`.

---

## 8. Keterkaitan
- Database: [05-database-design](05-database-design.md)
- Auth & keamanan: [04-authentication-security](04-authentication-security.md)
- API: [16-api-design](16-api-design.md)
