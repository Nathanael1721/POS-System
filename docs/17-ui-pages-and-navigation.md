# 17 — UI Pages & Navigation

> **Status:** ✅ Terimplementasi · 📅 halaman baru sesuai fitur rencana
> **Ringkasan:** Frontend Next.js 14 (App Router) terdiri dari halaman login dan shell dashboard (sidebar + header + breadcrumb). Menu ditampilkan sesuai peran; penegakan tetap di server.

---

## 1. Peta Halaman

```
/login                       (publik)        Form masuk
/                            redirect         → /cashier atau /login
(dashboard)/                 (terproteksi, shell)
  ├── /cashier               Terminal POS (owner+cashier) — dengan gate shift
  ├── /orders                Riwayat order
  ├── /shift                 Riwayat shift + detail (owner: semua; kasir: sendiri)
  ├── /products  (owner)     Kelola produk + form
  ├── /reports   (owner)     Ringkasan & top produk
  └── /settings              Profil, password, (owner) kelola kasir
```

Plus Next API route (proxy auth): `/api/auth/login`, `/api/auth/refresh`.

---

## 2. Navigasi & Role-Gating

Sidebar (`components/layout/Sidebar`) memfilter menu berdasarkan peran:

| Menu | owner | cashier |
|------|:-----:|:-------:|
| POS Terminal (`/cashier`) | ✅ | ✅ |
| Orders (`/orders`) | ✅ | ✅ |
| Shift (`/shift`) | ✅ | ✅ |
| Products (`/products`) | ✅ | ❌ |
| Reports (`/reports`) | ✅ | ❌ |
| Settings (`/settings`) | ✅ | ✅ |

> Menyembunyikan menu hanya UX; otorisasi sebenarnya tetap di server (RBAC). Lihat [03-user-roles-permissions](03-user-roles-permissions.md).

---

## 3. Shell Dashboard
- `(dashboard)/layout.tsx`: memuat user via `GET /api/auth/me`; bila tak ada sesi → redirect `/login`.
- **Sidebar** (navigasi), **Header** (nama+peran, logout), **Breadcrumb** (jejak path).

---

## 4. Halaman Inti

### /cashier — Terminal POS (✅)
- ✅ **Gate shift**: jika belum ada shift terbuka → tampil kartu **Buka Shift** (modal awal) dan POS terkunci. Saat shift terbuka → **ShiftBar** di atas (waktu buka, jumlah order, penjualan tunai, kas seharusnya, tombol **Tutup Shift** → rekonsiliasi).
- Kiri: pencarian + filter kategori + **ProductGrid** (thumbnail gambar).
- Kanan: **CartPanel** (item, qty, diskon/pajak, metode bayar, shortcut tunai + pemisah ribuan, total & kembalian, tombol Charge).
- **ReceiptModal** setelah sukses (cetak nota / order baru).
- Komponen: `ProductGrid`, `CartPanel`, `NumPad` (📅), `ReceiptModal`; hook `useCart`, `useProducts`.

### /products — Kelola Produk (owner, ✅)
- Tabel produk (kolom **barcode**) + form buat/ubah (nama, SKU, **barcode**, harga, stok, kategori, **image URL + preview**, aktif).
- ✅ Tombol **Label** per produk → modal cetak label harga+barcode (JsBarcode).

### /orders — Riwayat (✅)
- Tabel order (filter tanggal & status) + panel detail (item & pembayaran). Kasir hanya lihat miliknya.

### /reports — Owner Dashboard (owner, ✅)
- Kartu ringkasan (omzet, jumlah order, rata-rata) + tabel top-5 produk; pemilih periode.
- 📅 Tambahan: grafik tren, laporan shift, ekspor.

### /settings — Pengaturan (✅)
- Edit profil (nama), ganti password, dan (owner) buat/nonaktif kasir.
- 📅 Tab pengaturan toko (pajak default, header/footer struk, logo).

---

## 5. Komponen & Pola
- **UI primitives** (`components/ui`): Button, Input, Select, Card.
- **api-client** (`lib/api-client`): fetch tertipe + refresh token otomatis pada 401.
- **Format**: `formatCurrency`, `formatThousands`, `quickCashSuggestions`, `formatDateTime` (`lib/utils`).
- Penanganan loading & error per halaman; pesan error dari `ApiClientError`.

---

## 6. Halaman/Komponen Rencana 📅
- Halaman **Shift** (buka/tutup, rekonsiliasi kas).
- Halaman **Audit log** (penelusuran untuk owner).
- Tab **Store settings**.
- Manajemen **voucher/promo** & **member**.

---

## 7. Keterkaitan
- Transaksi: [08-pos-sales-transaction](08-pos-sales-transaction.md)
- Laporan: [13-sales-reporting](13-sales-reporting.md)
- Settings: [15-settings-and-staff-management](15-settings-and-staff-management.md)
