# Dokumentasi Simple-POS

Kumpulan dokumentasi **requirement + teknis** untuk sistem Point of Sale (POS) ritel **Simple-POS**.
Gaya tiap dokumen adalah _hybrid_: ringkasan kebutuhan (requirement) diikuti detail teknis.

> 📦 **Riwayat versi & perubahan**: lihat [CHANGELOG.md](../CHANGELOG.md) (root).
> 🛠 **Cara berkontribusi & proses rilis**: [CONTRIBUTING.md](../CONTRIBUTING.md).
> 🎨 **Keputusan desain UI**: [superpowers/specs](superpowers/specs).

## Penanda status

Setiap fitur diberi penanda agar jelas mana yang sudah jadi vs masih rencana:

| Badge | Arti |
|-------|------|
| ✅ | **Terimplementasi** — sudah ada di kode dan berjalan |
| 🟡 | **Sebagian** — sebagian sudah ada, sebagian direncanakan |
| 📅 | **Direncanakan** — bagian dari visi produk, belum dibangun |

## Konteks produk

- **Jenis usaha:** ritel umum / minimarket (barang satuan ber-SKU/barcode).
- **Model:** satu toko per owner saat ini; multi-store sebagai visi 📅.
- **Stack:** Turborepo (TypeScript) — Next.js 14 (web) + Hono (api) + PostgreSQL (postgres.js, raw SQL) + Redis. Lihat [02-system-architecture](02-system-architecture.md).

## Daftar isi

| # | Dokumen | Fokus |
|---|---------|-------|
| 01 | [project-overview](01-project-overview.md) | Visi, tujuan, ruang lingkup, persona |
| 02 | [system-architecture](02-system-architecture.md) | Arsitektur, stack, deployment, multi-env |
| 03 | [user-roles-permissions](03-user-roles-permissions.md) | Peran owner/cashier & matriks izin |
| 04 | [authentication-security](04-authentication-security.md) | JWT, refresh, rate limit, keamanan |
| 05 | [database-design](05-database-design.md) | ERD, tabel, relasi, migrasi |
| 06 | [product-catalog](06-product-catalog.md) | Produk, kategori, SKU, barcode, gambar |
| 07 | [stock-management](07-stock-management.md) | Stok, pengurangan atomik, alert |
| 08 | [pos-sales-transaction](08-pos-sales-transaction.md) | Cart kasir & alur transaksi |
| 09 | [order-management](09-order-management.md) | Siklus order, status, riwayat |
| 10 | [payment-system](10-payment-system.md) | Metode bayar, kembalian, gateway |
| 11 | [discount-and-tax](11-discount-and-tax.md) | Diskon, promo, voucher, pajak |
| 12 | [receipt-and-printing](12-receipt-and-printing.md) | Struk, print thermal, e-receipt |
| 13 | [sales-reporting](13-sales-reporting.md) | Laporan penjualan, shift |
| 14 | [audit-log](14-audit-log.md) | Jejak audit aksi |
| 15 | [settings-and-staff-management](15-settings-and-staff-management.md) | Profil, password, kelola kasir |
| 16 | [api-design](16-api-design.md) | Konvensi REST & daftar endpoint |
| 17 | [ui-pages-and-navigation](17-ui-pages-and-navigation.md) | Halaman, komponen, navigasi |
| 18 | [development-roadmap](18-development-roadmap.md) | Fase pengembangan & status |
| 19 | [future-features](19-future-features.md) | Fitur masa depan & out-of-scope |
