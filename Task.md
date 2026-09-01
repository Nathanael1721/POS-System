# Claude Code Prompt — POS System (Production-Grade)

Paste prompt ini langsung ke Claude Code session baru.

---

## PROMPT

You are building a production-grade Point of Sale (POS) web application.
Your role is implementation only — write clean, complete, runnable code.
Do not simplify unless explicitly told. Do not skip error handling.
Do not add features beyond what is specified.

---

## Project identity

- Name: `simplepos`
- Type: Full-stack web app, multi-environment (dev / staging / production)
- Purpose: A POS system for small retail stores — product management, order processing, payment recording, sales reporting
- Stack decision: TypeScript everywhere (Next.js frontend + Node.js/Hono backend)

---

## Functional requirements

### Roles
- `owner` — full access: manage products, view all reports, manage cashiers
- `cashier` — restricted: process orders, view own shift summary only

### Features
1. **Auth** — email + password login, JWT access token (15min), refresh token (7d), RBAC middleware
2. **Product management** — CRUD products, categories, SKU, price, stock quantity
3. **Order processing** — add items to cart, apply discount (%), select payment method (cash/qris/card), confirm order, deduct stock atomically
4. **Payment recording** — record amount paid, calculate change for cash, store payment reference for non-cash
5. **Receipt** — generate receipt data (order items, totals, cashier name, store name, timestamp); no PDF needed, JSON only
6. **Sales report** — daily/weekly/monthly summary: total revenue, total orders, top 5 products by quantity sold
7. **Audit log** — every state-changing action (create/update/delete product, confirm order, login) must write to `audit_logs` with user_id, store_id, action string, JSON payload snapshot, IP address

---

## Database schema

Use this exact schema. Do not alter table names or column names.

```sql
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'cashier')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- stores
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  currency VARCHAR(10) DEFAULT 'IDR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0
);

-- products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  price DECIMAL(15,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES users(id),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'qris', 'card')),
  subtotal DECIMAL(15,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- order_items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  quantity INT NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL
);

-- payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  amount_paid DECIMAL(15,2) NOT NULL,
  change_given DECIMAL(15,2) DEFAULT 0,
  method VARCHAR(20) NOT NULL,
  reference VARCHAR(255),
  paid_at TIMESTAMPTZ DEFAULT now()
);

-- audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  payload JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Directory structure

Generate exactly this structure. No deviation.

```
simplepos/
├── apps/
│   ├── web/                         # Next.js 14 App Router frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── cashier/
│   │   │   │   │   └── page.tsx     # POS terminal UI
│   │   │   │   ├── products/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── orders/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── reports/
│   │   │   │       └── page.tsx
│   │   │   └── api/                 # Next.js API routes for auth only
│   │   │       └── auth/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui primitives
│   │   │   ├── pos/                 # POS-specific: CartPanel, ProductGrid, NumPad
│   │   │   └── layout/              # Sidebar, Header, Breadcrumb
│   │   ├── lib/
│   │   │   ├── api-client.ts        # Typed fetch wrapper to backend
│   │   │   └── auth.ts              # JWT decode, token refresh logic
│   │   ├── hooks/
│   │   │   ├── useCart.ts
│   │   │   └── useProducts.ts
│   │   └── types/
│   │       └── index.ts             # Shared TypeScript types
│   │
│   └── api/                         # Hono backend
│       ├── src/
│       │   ├── index.ts             # App entrypoint
│       │   ├── db/
│       │   │   ├── client.ts        # postgres.js connection
│       │   │   └── migrations/      # numbered SQL files
│       │   │       ├── 001_init.sql
│       │   │       └── 002_seed.sql
│       │   ├── middleware/
│       │   │   ├── auth.ts          # JWT verify + attach user to context
│       │   │   ├── rbac.ts          # role check middleware factory
│       │   │   └── audit.ts         # audit log middleware
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── products.ts
│       │   │   ├── categories.ts
│       │   │   ├── orders.ts
│       │   │   └── reports.ts
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── product.service.ts
│       │   │   ├── order.service.ts
│       │   │   └── report.service.ts
│       │   └── utils/
│       │       ├── order-number.ts  # generate unique order number
│       │       └── errors.ts        # typed error classes
│       ├── Dockerfile
│       └── fly.toml                 # stub, I will configure
│
├── packages/
│   └── shared/                      # Shared Zod schemas + TypeScript types
│       └── src/
│           ├── schemas/
│           │   ├── auth.schema.ts
│           │   ├── product.schema.ts
│           │   └── order.schema.ts
│           └── index.ts
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   # lint + test + build on PR
│       └── deploy.yml               # staging on push to main; prod on release tag
│
├── docker-compose.yml               # local dev: postgres + redis + api + web
├── package.json                     # turborepo root
├── turbo.json
└── .env.example                     # all required env vars with placeholder values, no real secrets
```

---

## API contract

### Auth
```
POST /api/auth/login          body: {email, password}        → {access_token, refresh_token, user}
POST /api/auth/refresh        body: {refresh_token}          → {access_token}
POST /api/auth/logout         header: Bearer token           → 200
GET  /api/auth/me             header: Bearer token           → {user}
```

### Products
```
GET    /api/products          ?category_id=&search=&page=&limit=   → paginated list
POST   /api/products          body: product payload               → created product
PATCH  /api/products/:id      body: partial product               → updated product
DELETE /api/products/:id                                          → 204
```

### Orders
```
POST /api/orders              body: {items:[{product_id, quantity}], discount_percent, payment_method, amount_paid}
                              → {order, payment, receipt}
GET  /api/orders              ?date=&status=&page=&limit=         → paginated list
GET  /api/orders/:id                                              → full order with items
```

### Reports
```
GET /api/reports/summary      ?period=daily|weekly|monthly&date=  → {total_revenue, total_orders, avg_order_value}
GET /api/reports/top-products ?period=&limit=5                    → [{product_name, quantity_sold, revenue}]
```

---

## Business logic rules

### Order processing (atomic)
All of the following must succeed in a single database transaction or the entire operation rolls back:
1. Validate all product_ids exist and are active in the same store
2. Validate stock >= requested quantity for each item
3. Calculate subtotal per item (unit_price × quantity)
4. Calculate order subtotal, discount_amount, tax_amount, total
5. INSERT order record
6. INSERT all order_items records
7. UPDATE products stock (stock = stock - quantity) for each item
8. INSERT payment record
9. Write audit_log entry
10. Return full receipt object

### Order number format
```
{STORE_PREFIX}-{YYYYMMDD}-{5-digit-sequence}
Example: STR-20250626-00001
```
Sequence resets daily per store.

### JWT
- Access token: 15 minutes, signed with `ACCESS_TOKEN_SECRET`
- Refresh token: 7 days, stored in `payments` — no, stored in Redis (Upstash) with key `refresh:{user_id}:{token_hash}`
- On refresh: verify token in Redis, issue new access token, rotate refresh token

---

## Non-functional requirements

### Error handling
- All errors return `{error: string, code: string, details?: any}` with appropriate HTTP status
- Never expose stack traces in production responses
- Use typed error classes: `ValidationError`, `AuthError`, `NotFoundError`, `ConflictError`

### Validation
- Use Zod for all request body validation in backend routes
- Return 422 with field-level errors on validation failure: `{error: "Validation failed", fields: [{field, message}]}`

### Rate limiting
- `/api/auth/login` — max 5 requests per 15 minutes per IP (via Upstash Redis)
- All other endpoints — max 100 requests per minute per user

### Security
- Passwords hashed with bcrypt, cost factor 12
- All endpoints except `/api/auth/login` require valid JWT
- RBAC enforced: cashier cannot access `/api/reports/*`, `/api/products` (POST/PATCH/DELETE)
- All database queries use parameterized statements — no string interpolation
- CORS: allow only `FRONTEND_URL` env var

### Observability hooks (stubs only — I will configure)
- Add Sentry init call in `apps/api/src/index.ts` and `apps/web/app/layout.tsx` using env var `SENTRY_DSN`
- Add structured JSON logging in backend using `pino`: every request logs `{method, path, status, duration_ms, user_id}`

---

## Docker requirements

### apps/api/Dockerfile
```dockerfile
FROM node:20-alpine AS base
# multi-stage: deps → build → production
# production stage must run as non-root user
# EXPOSE 3001
```

### docker-compose.yml (local dev)
Services:
- `postgres`: postgres:16-alpine, port 5432, volume for persistence
- `redis`: redis:7-alpine, port 6379
- `api`: build from apps/api, depends_on postgres + redis, hot reload via nodemon
- `web`: build from apps/web, depends_on api, hot reload

---

## GitHub Actions — CI workflow (apps/.github/workflows/ci.yml)

```yaml
# Trigger: pull_request to main
# Jobs (in order, each depends on previous):
# 1. lint      — eslint + tsc --noEmit on both apps
# 2. test      — vitest unit tests
# 3. build     — turbo build (verifies production build succeeds)
# 4. security  — snyk test (use SNYK_TOKEN secret)
```

Write the complete workflow YAML. Use `actions/cache` for node_modules.

---

## GitHub Actions — Deploy workflow (apps/.github/workflows/deploy.yml)

```yaml
# Trigger: push to main (staging), release published (production)
# Jobs:
# 1. build-and-push — docker buildx build + push to ghcr.io/${{ github.repository }}/api:${{ github.sha }}
# 2. deploy-staging — flyctl deploy --config fly.staging.toml --image <sha-image>
#                     then: flyctl ssh console -a simplepos-staging -C "node dist/db/migrate.js"
#                     then: curl smoke test endpoint
#                     condition: push to main only
# 3. deploy-production — same pattern, fly.production.toml, simplepos-prod
#                        condition: release event only
#                        environment: production  (requires manual approval in GitHub)
```

Write the complete workflow YAML.

---

## .env.example

Include all required variables with placeholder values:
```
DATABASE_URL=postgresql://user:password@localhost:5432/simplepos
REDIS_URL=redis://localhost:6379
ACCESS_TOKEN_SECRET=change_me_32_chars_minimum
REFRESH_TOKEN_SECRET=change_me_32_chars_minimum
FRONTEND_URL=http://localhost:3000
SENTRY_DSN=
DOPPLER_TOKEN=
PORT=3001
NODE_ENV=development
```

---

## What to generate first

Generate in this exact order:
1. `package.json` (root, turborepo config)
2. `turbo.json`
3. `packages/shared/` — all Zod schemas and types
4. `apps/api/src/db/migrations/001_init.sql` — exact schema above
5. `apps/api/src/` — full backend implementation
6. `apps/web/` — full frontend implementation
7. `docker-compose.yml`
8. `Dockerfile` for api
9. `.github/workflows/ci.yml`
10. `.github/workflows/deploy.yml`
11. `.env.example`

Do not stop after one file. Generate all files completely before stopping.
If a file is long, complete it fully — do not truncate with "// ... rest of implementation".

---

## What NOT to do
- Do not use `any` in TypeScript
- Do not use `console.log` for logging in backend — use pino
- Do not put secrets in code — always read from environment variables
- Do not write inline SQL in route handlers — SQL belongs in service layer
- Do not use Prisma or any ORM — use `postgres.js` with raw SQL
- Do not create additional features beyond what is specified above

