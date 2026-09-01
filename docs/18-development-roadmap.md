# 18 — Development Roadmap

> **Status:** dokumen perencanaan
> **Ringkasan:** Status pengembangan saat ini dan rencana fase berikutnya. Versi terkini: **v1.4.0** (lihat [CHANGELOG](../CHANGELOG.md)). Prioritas lanjutan: engine promo & member, multi-store & payment gateway, cetak thermal, dan PWA.

---

## 1. Status Saat Ini (✅ Fase 1 — MVP POS)

Sudah berjalan & teruji:
- ✅ Auth (JWT access/refresh, RBAC owner/cashier, rate limit).
- ✅ Produk & kategori (CRUD, SKU, harga, stok, gambar, soft-delete).
- ✅ Transaksi POS atomik + pengurangan stok anti-oversell.
- ✅ Pembayaran tunai/QRIS/kartu (manual) + kembalian.
- ✅ Struk JSON + cetak browser (+ cetak ulang dari riwayat, auto-print opsional).
- ✅ Laporan ringkasan + top-5 produk + navigasi periode historis (harian s/d tahunan).
- ✅ Audit log (pencatatan penuh + **viewer** owner).
- ✅ Settings: profil, ganti password, kelola kasir, pengaturan toko.
- ✅ **Barcode**: field barcode produk, scan-to-add di kasir, pencarian via barcode, cetak label harga+barcode.
- ✅ **Shift & laci kas**: buka/tutup shift, order wajib shift aktif, rekonsiliasi kas (selisih), riwayat.
- ✅ **Void/batal order** dengan pengembalian stok + alasan tercatat di audit (v1.4.0).
- ✅ **Dashboard beranda owner** + tren pendapatan + export CSV (v1.4.0).
- ✅ UI/UX: design system Modern Clean SaaS, Bahasa Indonesia, responsive mobile (v1.1.0–v1.3.0).
- ✅ Infra: docker-compose lokal, CI/CD, Dockerfile, migrasi forward-only.

---

## 2. Fase 2 — Operasional Toko (✅ selesai)

| Fitur | Status | Dokumen | Catatan |
|-------|--------|---------|---------|
| **Barcode & label harga** | ✅ | [06](06-product-catalog.md), [08](08-pos-sales-transaction.md), [12](12-receipt-and-printing.md) | selesai |
| **Shift kasir & laci kas** | ✅ | [13](13-sales-reporting.md) | selesai |
| **Void/refund order** | ✅ | [09](09-order-management.md) | selesai (v1.4.0) — void + kembalikan stok |
| **Pengaturan toko** | ✅ | [15](15-settings-and-staff-management.md) | selesai (v1.4.0) — pajak default, ambang stok, auto-print |
| **Cetak thermal ESC-POS** | 📅 | [12](12-receipt-and-printing.md) | 58/80mm — butuh service Node terpisah (USB/serial) |
| **Stok lanjutan** | 🟡 | [07](07-stock-management.md) | alert & watchlist ✅; penyesuaian & opname 📅 |

---

## 3. Fase 3 — Pemasaran & Loyalitas (🟡 berjalan)

| Fitur | Status | Dokumen |
|-------|-------|---------|
| Laporan lanjutan (grafik tren, export CSV) | ✅ | [13](13-sales-reporting.md) |
| Laporan per-kasir / per-metode bayar | 📅 | [13](13-sales-reporting.md) |
| Engine **promo & voucher** | 📅 | [11](11-discount-and-tax.md) |
| **Diskon member & loyalty** (poin) | 📅 | [11](11-discount-and-tax.md), [19](19-future-features.md) |
| **e-Receipt** WhatsApp/Email | 📅 | [12](12-receipt-and-printing.md) |

---

## 4. Fase 4 — Skala & Integrasi (📅)

| Fitur | Dokumen |
|-------|---------|
| **Multi-store / multi-cabang** | [19](19-future-features.md) |
| **Payment gateway** (QRIS/kartu otomatis + webhook) | [10](10-payment-system.md) |
| Reset password via email | [04](04-authentication-security.md) |
| Penelusuran audit & retensi | [14](14-audit-log.md) |
| Mode offline / PWA | [19](19-future-features.md) |

---

## 5. Prinsip Eksekusi
1. Tiap fitur baru: perbarui dokumen terkait (ubah badge 📅 → ✅) saat selesai.
2. Pertahankan invariannya: transaksi atomik, parameterized SQL, RBAC server, audit.
3. Migrasi DB forward-only & teruji di staging sebelum produksi.
4. Tambah unit test untuk logika uang/stok/promo.

---

## 6. Keterkaitan
- Overview: [01-project-overview](01-project-overview.md)
- Future: [19-future-features](19-future-features.md)
