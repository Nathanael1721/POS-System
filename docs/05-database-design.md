# 05 — Database Design

> **Status:** ✅ Terimplementasi (📅 beberapa kolom/tabel rencana)
> **Ringkasan:** PostgreSQL dengan 8 tabel inti + tabel migrasi. Akses via postgres.js (raw SQL, parameterized). Uang disimpan `DECIMAL(15,2)`; perhitungan dilakukan dalam satuan sen integer pada aplikasi.

---

## 1. Entity Relationship Diagram

```
stores ─┬─< users
        ├─< categories ─< products
        ├─< products ─< order_items >─ orders
        ├─< orders ─┬─< order_items
        │           └─1 payments
        └─< audit_logs >─ users
```

- `stores 1—N users` (sebuah toko punya banyak staf)
- `stores 1—N categories`, `categories 1—N products`
- `orders 1—N order_items`, `orders 1—1 payments`
- `products 1—N order_items` (produk direferensikan di banyak order)
- `audit_logs` mengacu ke `users` & `stores`

---

## 2. Tabel

### stores
Identitas toko. `owner_id` menunjuk pemilik. `currency` default `IDR`.

### users
Akun staf. Kolom kunci: `email` (unik), `password_hash`, `role` (`owner`|`cashier`), `is_active`, `store_id`.

### categories
Pengelompokan produk per toko, dengan `sort_order`.

### products
Kolom: `name`, `sku`, `barcode` (✅, unik per toko), `price DECIMAL(15,2)`, `stock INT`, `image_url` (✅), `is_active`, `category_id`.
📅 Rencana kolom: `cost_price` (HPP), `track_stock` (flag).

### orders
Header transaksi: `order_number` (unik), `status` (`pending`|`paid`|`cancelled`), `payment_method` (`cash`|`qris`|`card`), `subtotal`, `discount_percent`, `discount_amount`, `tax_percent`, `tax_amount`, `total`.

### order_items
Baris produk: snapshot `product_name` & `unit_price` (harga saat transaksi), `quantity`, `subtotal`.
> Nama & harga di-_snapshot_ agar riwayat tidak berubah saat master produk diubah.

### payments
1:1 dengan order: `amount_paid`, `change_given`, `method`, `reference` (untuk non-tunai), `paid_at`.

### shifts ✅
Shift kasir & laci kas (migrasi `005`): `cashier_id`, `store_id`, `status` (open/closed), `opening_cash`, `counted_cash`, `expected_cash`, `difference`, `total_sales`, `cash_sales`, `noncash_sales`, `order_count`, `notes`, `opened_at`, `closed_at`. Unique index: satu shift `open` per kasir. `orders.shift_id` menaut order ke shift. Detail: [13-sales-reporting](13-sales-reporting.md) §4.

### audit_logs
Jejak aksi: `user_id`, `store_id`, `action`, `payload JSONB`, `ip_address`, `created_at`.

### schema_migrations
Internal: melacak file migrasi yang sudah diterapkan.

---

## 3. Indeks Penting

```sql
idx_products_store(store_id)
idx_products_category(category_id)
idx_orders_store_created(store_id, created_at)
idx_orders_cashier(cashier_id)
idx_order_items_order(order_id)
idx_order_items_product(product_id)
idx_audit_logs_store_created(store_id, created_at)
idx_orders_number_prefix(store_id, order_number)
idx_users_store_role(store_id, role)
```

Tujuan: listing terfilter (produk per kategori, order per tanggal), agregasi laporan, dan lookup nomor order harian.

---

## 4. Penanganan Uang (penting)

- Kolom uang: `DECIMAL(15,2)` → dikembalikan postgres.js sebagai **string** (presisi terjaga).
- Perhitungan di aplikasi memakai **integer sen**: `toCents()`, `fromCents()`, `percentOfCents()` (`utils/money.ts`).
- Urutan kalkulasi total dibakukan; lihat [11-discount-and-tax](11-discount-and-tax.md).

---

## 5. Migrasi

- File SQL bernomor di `apps/api/src/db/migrations/`:
  - `001_init.sql` — skema awal.
  - `002_seed.sql` — data demo (idempotent, bcrypt via pgcrypto).
  - `003_product_image_and_users.sql` — `products.image_url` + index user.
  - `004_product_barcode.sql` — `products.barcode` + unique index per toko.
  - `005_shifts.sql` — tabel `shifts` + `orders.shift_id`.
  - `006_product_images.sql` — tabel `product_images` (BYTEA) untuk upload gambar.
  - `007_shift_toggle_and_cash.sql` — `stores.shift_enabled`, `shifts.cash_in/out`, tabel `shift_cash_movements`.
- Runner: `src/db/migrate.ts` — forward-only, tiap file dijalankan sekali dalam transaksi, dicatat di `schema_migrations`.
- Jalankan: `pnpm --filter @simplepos/api migrate`.

📅 Migrasi mendatang: tabel `promotions`/`vouchers`/`members`, `store_settings`.

---

## 6. Edge Case & Integritas
- **FK & ON DELETE**: hapus store → cascade ke data turunannya; hapus produk membiarkan `order_items` (riwayat tetap, snapshot menjaga nama/harga).
- **UNIQUE `order_number`**: mencegah duplikasi nomor saat race; transaksi yang kalah race akan rollback.
- **UNIQUE `payments.order_id`**: satu order satu pembayaran.
- **CHECK** pada `role`, `status`, `payment_method` menjaga nilai enum.

---

## 7. Keterkaitan
- Arsitektur: [02-system-architecture](02-system-architecture.md)
- Produk: [06-product-catalog](06-product-catalog.md)
- Order: [09-order-management](09-order-management.md)
