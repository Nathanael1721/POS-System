# 01 — Project Overview

> **Status:** ✅ Terimplementasi (inti) · 📅 sebagian visi
> **Ringkasan:** Simple-POS adalah aplikasi Point of Sale (POS) berbasis web untuk toko ritel kecil / minimarket. Fokusnya: kasir cepat, manajemen produk & stok, pencatatan pembayaran, dan laporan penjualan untuk pemilik.

---

## 1. Tujuan

Menyediakan sistem kasir modern yang:
- Mempercepat proses transaksi di meja kasir (cari produk → masukkan ke cart → bayar → cetak struk).
- Menjaga **akurasi stok** secara real-time melalui transaksi atomik.
- Memberi **pemilik** visibilitas penjualan (omzet, jumlah order, produk terlaris).
- Mencatat **jejak audit** untuk setiap aksi penting demi akuntabilitas.

### Masalah yang diselesaikan
- Pencatatan manual rawan salah hitung & kehilangan data.
- Pemilik tidak tahu performa penjualan harian secara cepat.
- Stok tidak sinkron antara catatan dan fisik.
- Tidak ada kontrol akses antara pemilik dan kasir.

---

## 2. Persona Pengguna

| Persona | Peran sistem | Kebutuhan utama |
|---------|--------------|-----------------|
| **Pemilik toko** | `owner` | Kelola produk & harga, lihat laporan, kelola akun kasir, atur toko |
| **Kasir** | `cashier` | Proses transaksi cepat, lihat ringkasan shift sendiri |
| **Pelanggan** | (eksternal) | Menerima struk; tidak punya akun di sistem |

Detail izin: lihat [03-user-roles-permissions](03-user-roles-permissions.md).

---

## 3. Ruang Lingkup

### In-scope (✅ sudah / 🟡 sebagian)
- ✅ Autentikasi email+password, JWT, RBAC owner/cashier.
- ✅ Manajemen produk & kategori (CRUD, SKU, harga, stok, gambar).
- ✅ Transaksi penjualan atomik dengan pengurangan stok.
- ✅ Pembayaran tunai/QRIS/kartu + perhitungan kembalian.
- ✅ Struk (data JSON) + cetak via browser.
- ✅ Laporan penjualan harian/mingguan/bulanan + top-5 produk.
- ✅ Audit log untuk aksi state-changing.
- ✅ Pengaturan profil, ganti password, pembuatan kasir.

### Visi (📅 direncanakan)
- 📅 Barcode scanner & cetak label harga.
- 📅 Shift kasir & rekonsiliasi laci kas.
- 📅 Engine promo: diskon item, voucher, diskon member.
- 📅 Pajak default per-toko.
- 📅 Cetak thermal ESC-POS & e-receipt (WhatsApp/Email).
- 📅 Integrasi payment gateway (QRIS/kartu otomatis).
- 📅 Multi-store / multi-cabang.

### Out-of-scope (tidak akan dibangun di produk ini)
- ❌ Etalase belanja online / keranjang pelanggan.
- ❌ Pengiriman & logistik (shipping/delivery).
- ❌ Ulasan & rating produk oleh pelanggan.
- ❌ Manajemen pemasok/supplier & purchase order.

Alasan lengkap di [19-future-features](19-future-features.md).

---

## 4. Prinsip Desain

1. **Akurasi di atas kecepatan menulis** — uang dihitung dalam satuan sen (integer) untuk menghindari galat pembulatan; perubahan stok selalu transaksional.
2. **Keamanan default** — semua endpoint (kecuali login) butuh JWT; RBAC ditegakkan di server.
3. **Auditable** — setiap aksi penting terekam di `audit_logs`.
4. **TypeScript end-to-end** — kontrak data dibagikan lewat paket `@simplepos/shared` (Zod + tipe).

---

## 5. Glosarium

| Istilah | Arti |
|---------|------|
| **Order** | Satu transaksi penjualan (header) berisi beberapa item |
| **Order item** | Baris produk dalam sebuah order |
| **SKU** | Stock Keeping Unit, kode identifikasi produk |
| **Receipt / Nota** | Struk hasil transaksi |
| **Shift** | Periode kerja seorang kasir (📅) |
| **RBAC** | Role-Based Access Control |
| **Audit log** | Catatan aksi pengguna yang mengubah data |

---

## 6. Keterkaitan
- Arsitektur: [02-system-architecture](02-system-architecture.md)
- Roadmap & status: [18-development-roadmap](18-development-roadmap.md)
- Fitur masa depan: [19-future-features](19-future-features.md)
