# 06 — Product Catalog

> **Status:** ✅ Terimplementasi (termasuk **barcode**) · 📅 varian & upload gambar
> **Ringkasan:** Manajemen produk dan kategori per toko: nama, SKU, **barcode**, harga, stok, gambar, status aktif. CRUD produk khusus owner; daftar produk bisa diakses semua staf untuk transaksi.

---

## 1. Requirement

- Owner dapat **menambah, mengubah, menghapus** produk & kategori.
- Setiap produk: nama, harga, stok, opsional SKU, kategori, gambar, status aktif.
- Kasir dapat **melihat & mencari** produk untuk transaksi (read-only).
- Produk **nonaktif** tidak bisa dijual tetapi riwayatnya tetap ada.
- 📅 Produk dapat dicari/ditambahkan via **barcode**.

### Kriteria penerimaan
- Membuat produk dengan harga negatif → 422.
- Kasir POST/PATCH/DELETE produk → 403.
- Pencarian mendukung nama & SKU, dengan paginasi.

---

## 2. Model Data (products)

| Kolom | Tipe | Catatan |
|-------|------|---------|
| `id` | uuid | PK |
| `store_id` | uuid | FK stores |
| `category_id` | uuid? | FK categories (nullable) |
| `name` | varchar(255) | wajib |
| `sku` | varchar(100)? | opsional |
| `price` | decimal(15,2) | ≥ 0, maks 2 desimal |
| `stock` | int | ≥ 0 |
| `image_url` | text? | ✅ URL gambar |
| `barcode` | varchar(100)? | ✅ unik per toko, untuk scan & label |
| `is_active` | boolean | default true |

Kategori (`categories`): `name`, `sort_order`.

---

## 3. Endpoint

| Method | Path | Role | Keterangan |
|--------|------|------|-----------|
| GET | `/api/products?category_id=&search=&page=&limit=` | semua | daftar terpaginasi (search mencakup nama/SKU/**barcode**) |
| GET | `/api/products/:id` | semua | detail |
| GET | `/api/products/barcode/:code` | semua | ✅ lookup eksak via barcode (scan-to-add) |
| POST | `/api/products` | owner | buat |
| PATCH | `/api/products/:id` | owner | ubah sebagian |
| DELETE | `/api/products/:id` | owner | hapus |
| GET | `/api/categories` | semua | daftar kategori |
| POST | `/api/categories` | owner | ✅ buat kategori (UI: panel **Kategori** di halaman Products) |
| DELETE | `/api/categories/:id` | owner | hapus kategori (produk terkait → tanpa kategori) |
| POST | `/api/products/:id/image` | owner | ✅ upload gambar (multipart `file`) |

### Contoh — buat produk
```http
POST /api/products
{
  "name": "Bottled Water 600ml",
  "sku": "BEV-001",
  "price": 4000,
  "stock": 200,
  "category_id": "…",
  "image_url": "https://…/water.jpg",
  "is_active": true
}
```

---

## 4. Validasi (Zod, `product.schema.ts`)
- `name` 1–255 char; `price` non-negatif, maks 2 desimal; `stock` integer ≥ 0.
- `image_url` harus URL valid (atau kosong → null).
- `category_id` UUID valid milik toko atau null (jika kategori dihapus → produk `category_id` jadi null).
- PATCH menolak body kosong (minimal satu field).

---

## 5. Gambar Produk
- ✅ Dua opsi: **URL eksternal** (`image_url`) **atau upload file** ke database.
- ✅ **Upload ke database**: file disimpan di tabel `product_images` (BYTEA, maks 2 MB, PNG/JPG/WEBP/GIF). `image_url` di-set ke endpoint serve `/media/products/:id/image`.
  - Endpoint: `POST /api/products/:id/image` (owner, multipart field `file`) → simpan; `GET /media/products/:id/image` (publik, agar `<img>` bisa memuat) → byte gambar.
  - Daftar produk tetap ramping (byte gambar di tabel terpisah, tidak ikut `SELECT *`).
- ✅ Ditampilkan sebagai **thumbnail** di grid kasir **dan tabel produk** + form; fallback ikon 📦 bila kosong/rusak.
- ✅ Helper klien `resolveImageUrl()` menggabungkan URL eksternal & path `/media` relatif.
- 📅 Untuk skala besar: pindah ke object storage (Supabase Storage) + resize otomatis (byte di Postgres kurang ideal saat volume besar).

---

## 6. Barcode ✅ (terimplementasi)
- ✅ Kolom `products.barcode` (unik per toko, partial unique index `WHERE barcode IS NOT NULL`).
- ✅ Input produk: field barcode (scan/ketik). Validasi karakter `[A-Za-z0-9-._]`.
- ✅ Kasir: input scanner (keyboard wedge) — ketik kode lalu **Enter** → lookup eksak `GET /api/products/barcode/:code` → otomatis tambah ke cart (cek aktif & stok).
- ✅ Pencarian daftar produk juga mencakup barcode.
- ✅ Cetak **label harga + barcode** (CODE128 via JsBarcode, grid, print browser). Lihat [12-receipt-and-printing](12-receipt-and-printing.md).
- 📅 Tombol "generate" barcode otomatis & dukungan EAN-13 dengan check digit.

---

## 7. Edge Case
- Hapus kategori yang dipakai produk → `category_id` produk di-set null (ON DELETE SET NULL), produk tidak ikut terhapus.
- Hapus produk yang sudah pernah terjual → `order_items` tetap (snapshot nama/harga menjaga riwayat).
- SKU/barcode duplikat 📅 → divalidasi unik per toko.

---

## 8. Keterkaitan
- Stok: [07-stock-management](07-stock-management.md)
- Transaksi: [08-pos-sales-transaction](08-pos-sales-transaction.md)
- Database: [05-database-design](05-database-design.md)
