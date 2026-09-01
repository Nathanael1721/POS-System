# 19 — Future Features & Out-of-Scope

> **Status:** 📅 visi & keputusan ruang lingkup
> **Ringkasan:** Daftar fitur masa depan beserta arah desainnya, plus penjelasan eksplisit fitur yang **sengaja tidak** dibangun di produk POS ini dan alasannya.

---

> Catatan: **Sudah ✅ terimplementasi** (Fase 2): **Barcode & label harga** dan **Shift kasir & laci kas**. Lihat [06-product-catalog](06-product-catalog.md), [13-sales-reporting](13-sales-reporting.md) & [18-development-roadmap](18-development-roadmap.md).

## 1. Fitur Direncanakan (📅)

### b. Shift — Lanjutan
Inti shift (buka/tutup, rekonsiliasi, riwayat) **sudah ✅**. Lanjutan 📅: pengeluaran kas (cash-out) dalam shift, setoran tunai antar-shift, dan cetak laporan shift. Lihat [13-sales-reporting](13-sales-reporting.md).

### c. Engine Promo, Voucher & Member
- Diskon per-item, kode voucher (periode/kuota/minimum), diskon member berbasis tier.
- **Loyalty/poin**: akumulasi poin per transaksi, tukar poin.
- Tabel `promotions`, `vouchers`, `members`. Lihat [11-discount-and-tax](11-discount-and-tax.md).

### d. Cetak Thermal & e-Receipt
Printer ESC-POS 58/80mm; struk digital via WhatsApp/Email. Lihat [12-receipt-and-printing](12-receipt-and-printing.md).

### e. Payment Gateway (generik)
Integrasi QRIS dinamis/kartu dengan konfirmasi otomatis via webhook (vendor belum diputuskan). Lihat [10-payment-system](10-payment-system.md).

### f. Multi-Store / Multi-Cabang
Satu owner mengelola banyak outlet: data ter-scope per `store_id`, laporan gabungan & per-cabang, transfer stok antar-cabang, peran tambahan (mis. `manager` cabang). Skema saat ini sudah membawa `store_id` sehingga pondasinya ada.

### g. Stok Lanjutan
Alert stok rendah, penyesuaian manual, stok opname, `stock_movements`. Lihat [07-stock-management](07-stock-management.md).

### h. Lainnya
- Void/refund & hold transaksi ([09](09-order-management.md)).
- Reset password via email ([04](04-authentication-security.md)).
- Penelusuran & retensi audit ([14](14-audit-log.md)).
- Laporan margin/laba (butuh `cost_price`).
- Mode **offline / PWA** untuk kasir saat internet putus (sinkron saat online).
- Multi-mata uang / multi-bahasa.

---

## 2. Sengaja Out-of-Scope (❌)

Fitur khas e-commerce/marketplace ini **tidak** dibangun karena tidak sesuai model POS ritel in-store:

| Fitur | Alasan tidak dibangun |
|-------|----------------------|
| **Shipping & delivery** | Transaksi terjadi di tempat (tatap muka). Tidak ada alamat/kurir/ongkir. |
| **Customer review & rating** | Tidak ada akun pelanggan; pelanggan hanya menerima struk. |
| **Supplier management & purchase order** | Di luar fokus kasir; pengadaan dikelola proses terpisah. Penambahan stok cukup lewat "restock/adjustment" sederhana ([07](07-stock-management.md)), bukan modul supplier penuh. |
| **Etalase/keranjang belanja online** | Bukan toko online; "cart" di sini adalah keranjang kasir sementara. |

> Bila kebutuhan berubah (mis. toko ingin jualan online juga), fitur-fitur ini dapat dipertimbangkan ulang sebagai produk/integrasi terpisah, bukan bagian inti POS.

---

## 3. Kriteria Memindahkan dari 📅 ke ✅
Sebuah fitur dianggap selesai bila:
1. Skema/migrasi diterapkan & teruji.
2. Endpoint + validasi + RBAC + audit lengkap.
3. UI terkait tersedia.
4. Unit test untuk logika kritis (uang/stok/promo).
5. Dokumen terkait diperbarui (badge 📅 → ✅).

---

## 4. Keterkaitan
- Roadmap & urutan: [18-development-roadmap](18-development-roadmap.md)
- Overview & ruang lingkup: [01-project-overview](01-project-overview.md)
