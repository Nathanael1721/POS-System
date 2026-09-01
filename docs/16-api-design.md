# 16 — API Design

> **Status:** ✅ Terimplementasi
> **Ringkasan:** REST API berbasis Hono. Otorisasi Bearer JWT, validasi Zod (422 dengan error per-field), format error konsisten, paginasi seragam, dan rate limiting. SQL hanya di lapisan service.

---

## 1. Konvensi Umum

- **Base path**: `/api`.
- **Format**: JSON.
- **Auth**: header `Authorization: Bearer <access_token>` untuk semua endpoint kecuali `login`, `refresh`, dan health.
- **Penamaan**: resource jamak (`/products`, `/orders`), `snake_case` pada body/JSON.
- **Status sukses**: 200 (ok), 201 (created), 204 (no content).

---

## 2. Format Error (konsisten)

```json
{ "error": "Pesan terbaca", "code": "STABLE_CODE", "details": { } }
```

| Kelas error | HTTP | code |
|-------------|------|------|
| Validasi | 422 | `VALIDATION_ERROR` (+ `fields`) |
| Auth | 401 | `AUTH_ERROR` |
| Forbidden (RBAC) | 403 | `FORBIDDEN` |
| Not found | 404 | `NOT_FOUND` |
| Conflict | 409 | `CONFLICT` |
| Rate limit | 429 | `RATE_LIMITED` |
| Internal | 500 | `INTERNAL_ERROR` (tanpa stack di produksi) |

### Validasi 422
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "fields": [{ "field": "price", "message": "Price cannot be negative" }]
}
```

---

## 3. Paginasi (seragam)

Query: `?page=1&limit=20` (limit maks 100). Respons:
```json
{ "data": [ ... ], "page": 1, "limit": 20, "total": 57, "total_pages": 3 }
```

---

## 4. Daftar Endpoint

### Auth
```
POST /api/auth/login          {email,password} → {access_token,refresh_token,user}
POST /api/auth/refresh        {refresh_token}  → {access_token,refresh_token}
POST /api/auth/logout         Bearer           → 200
GET  /api/auth/me             Bearer           → {user}
```

### Products & Categories
```
GET    /api/products?category_id=&search=&page=&limit=   → paginated
GET    /api/products/:id                                  → product
POST   /api/products            (owner)                   → 201 product
PATCH  /api/products/:id        (owner)                   → product
DELETE /api/products/:id        (owner)                   → 204
GET    /api/categories                                    → {data}
POST   /api/categories          (owner)                   → 201 category
DELETE /api/categories/:id      (owner)                   → 204
```

### Orders
```
POST /api/orders   {items[],discount_percent,tax_percent,payment_method,amount_paid,reference}
                   → {order,payment,receipt}
GET  /api/orders?date=&status=&page=&limit=   → paginated (cashier: miliknya)
GET  /api/orders/:id                          → {order,items,payment}
POST /api/orders/:id/void  {reason}           → order (status=cancelled, stok dikembalikan)
```
Aturan void: hanya order berstatus `paid`; owner dapat void order siapa pun, kasir
hanya miliknya (404 bila bukan miliknya); void ganda → 409. Satu transaksi DB
bersama pengembalian stok dan entri audit `order.void`.

### Reports (owner)
```
GET /api/reports/summary?period=daily|weekly|monthly|yearly&date=   → {total_revenue,total_orders,avg_order_value}
GET /api/reports/top-products?period=&date=&limit=5                → [{product_name,quantity_sold,revenue}]
GET /api/reports/trend?period=          → [{bucket,revenue,orders}] (7 hari / 8 minggu / 12 bulan / 5 tahun)
GET /api/reports/export?period=&date=   → text/csv (attachment) seluruh order di jendela periode
```
`date` (YYYY-MM-DD) adalah **jangkar**: jendela dihitung di sekitarnya — dipakai
untuk melihat periode lampau; tanpa `date` berarti periode berjalan.

### Audit logs (owner) ✅ v1.4.0
```
GET /api/audit-logs?page=&limit=&action=&user_id=   → paginated AuditLogWithUser
```
`action` dicocokkan sebagai substring (ILIKE, mis. `order`, `product.delete`).
Tiap baris: `created_at`, `user_id` + `user_name` (JOIN), `action`, `payload`
(JSON snapshot), `ip_address`.

### Users (kelola staf)
```
PATCH  /api/users/me            {name}                     → {user}
POST   /api/users/me/password   {current_password,new_password} → 204
GET    /api/users               (owner)                    → {data}
POST   /api/users               (owner) {name,email,password,role} → 201 user
DELETE /api/users/:id           (owner)                    → 204
```

### Store (pengaturan toko) ✅
```
GET   /api/store                  store + flag operasional (semua user)
PATCH /api/store {shift_enabled?,name?,address?,default_tax_percent?,
                  low_stock_threshold?,auto_print_receipt?}   (owner)
```
`DELETE /api/products/:id` adalah **soft-delete** (`is_active=false`) — produk
ber-riwayat transaksi tidak dihapus fisik agar `order_items` tetap konsisten.

### Shifts (kasir & laci kas, opsional via store.shift_enabled) ✅
```
GET  /api/shifts/current                        shift terbuka caller + ringkasan
POST /api/shifts/open    {opening_cash}         → 201 shift (409 bila shift OFF)
POST /api/shifts/close   {counted_cash,notes?}  → shift + ringkasan (rekonsiliasi)
POST /api/shifts/cash-movement {type,amount,reason?}  → catat kas masuk/keluar
GET  /api/shifts?status=&page=&limit=           riwayat (owner: semua; kasir: sendiri)
GET  /api/shifts/:id                            detail + ringkasan
```
Ringkasan shift dihitung dari order `status='paid'` — order yang di-void otomatis
keluar dari rekap shift berjalan.

### Health (publik)
```
GET /health        → {status:"ok"}
GET /health/ready  → cek DB+Redis (200/503)
```

### 📅 Rencana
```
POST /api/payments/charge, POST /api/payments/webhook   (gateway)
POST /api/vouchers/validate                             (promo)
```

---

## 5. Aturan Implementasi
- Validasi body via `parseBody(c, schema)` & query via `parseQuery(c, schema)` (Zod).
- SQL **hanya** di service; route hanya orkestrasi + audit.
- Semua query parameterized (postgres.js tagged template).
- Header `X-Request-Id` di setiap respons; `Retry-After` saat 429.
- CORS dibatasi `FRONTEND_URL`.

---

## 6. Keterkaitan
- Auth: [04-authentication-security](04-authentication-security.md)
- Tiap domain: [06](06-product-catalog.md), [09](09-order-management.md), [13](13-sales-reporting.md), [15](15-settings-and-staff-management.md)
