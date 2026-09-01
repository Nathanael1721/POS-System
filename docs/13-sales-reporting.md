# 13 — Sales Reporting

> **Status:** ✅ Ringkasan, top produk, **shift & laci kas** · 📅 export, grafik, laporan per-kasir
> **Ringkasan:** Owner mendapat ringkasan penjualan per periode harian/mingguan/bulanan + 5 produk terlaris. **Shift kasir & rekonsiliasi laci kas sudah berjalan** (§4). Ekspor & grafik direncanakan.

---

## 1. Requirement

- Owner melihat **ringkasan** per periode: total omzet, total order, rata-rata nilai order.
- Owner melihat **top-5 produk** berdasarkan kuantitas terjual.
- Hanya order `paid` yang dihitung sebagai omzet.
- 📅 Laporan **shift** & **per-kasir**, ekspor, dan grafik tren.

### Kriteria penerimaan
- Kasir akses `/reports/*` → 403.
- Periode `daily`/`weekly`/`monthly` dengan tanggal acuan menghasilkan rentang benar.

---

## 2. Endpoint (✅)

| Method | Path | Keterangan |
|--------|------|-----------|
| GET | `/api/reports/summary?period=&date=` | `{total_revenue, total_orders, avg_order_value}` |
| GET | `/api/reports/top-products?period=&date=&limit=5` | `[{product_name, quantity_sold, revenue}]` |

`period`: `daily` \| `weekly` \| `monthly`. `date`: tanggal acuan `YYYY-MM-DD` (default hari ini).

### Definisi periode
- **daily**: 1 hari.
- **weekly**: minggu ISO (mulai Senin).
- **monthly**: 1 bulan kalender.
Rentang `[start, end)` (eksklusif di akhir), berbasis UTC.

---

## 3. Perhitungan
```
total_revenue   = Σ orders.total           (status = paid, dalam periode)
total_orders    = COUNT(orders)
avg_order_value = AVG(orders.total)
top_products    = Σ order_items.quantity per product_name, urut desc, limit N
```

---

## 4. Shift Kasir & Laci Kas ✅ (terimplementasi, **opsional**)

> **Toggle per toko**: fitur shift dikontrol `stores.shift_enabled` (**default OFF**). Diatur owner di **Settings → Pengaturan toko**. Saat OFF, kasir langsung berjualan tanpa shift dan menu Shift disembunyikan. Saat ON, berlaku alur di bawah. Lihat [15-settings-and-staff-management](15-settings-and-staff-management.md).

Konsep **shift kasir & laci kas** (saat toggle ON):
- ✅ **Buka shift**: kasir mencatat modal kas awal (opening float). Satu kasir hanya boleh punya satu shift terbuka. Membuka shift saat toggle OFF → 409.
- ✅ **Wajib shift**: order **tidak bisa dibuat** tanpa shift aktif → 409 "Buka shift dulu". Setiap order tertaut `orders.shift_id`. (Saat toggle OFF, order tidak butuh shift, `shift_id` null.)
- ✅ **Kas masuk/keluar (petty cash)**: selama shift, kasir bisa mencatat **kas masuk** (mis. tambah modal) & **kas keluar** (mis. beli galon) via `POST /api/shifts/cash-movement`. Tersimpan di `shift_cash_movements`.
- ✅ **Tutup shift**: sistem menghitung:
  - Total penjualan, tunai vs non-tunai, jumlah order, kas masuk & keluar.
  - **Kas seharusnya** = modal awal + penjualan **tunai** + kas masuk − kas keluar.
  - Kasir input **hitungan fisik** → **selisih** = dihitung − seharusnya (lebih/kurang, ditandai warna).
- ✅ **Riwayat shift**: halaman `/shift` (owner: semua; kasir: miliknya) + detail (termasuk kas masuk/keluar). Audit: `shift.open`, `shift.close`, `shift.cash_movement`.

Tabel `shifts` ✅ (migrasi `005_shifts.sql`):
| Kolom | Keterangan |
|-------|-----------|
| `cashier_id`, `store_id` | pemilik shift |
| `status` | `open` \| `closed` (unique index: 1 open per kasir) |
| `opened_at`, `closed_at` | waktu |
| `opening_cash` | modal awal |
| `expected_cash`, `counted_cash`, `difference` | rekonsiliasi |
| `total_sales`, `cash_sales`, `noncash_sales`, `cash_in`, `cash_out`, `order_count` | snapshot saat tutup |
| `notes` | catatan kasir |

Tabel `shift_cash_movements` ✅ (migrasi `007`): `shift_id`, `type` (in/out), `amount`, `reason`, `created_by`, `created_at`.

Endpoint ✅:
```
GET  /api/shifts/current      shift terbuka caller + ringkasan live (atau {shift:null})
POST /api/shifts/open         {opening_cash} → buka shift
POST /api/shifts/close        {counted_cash, notes?} → tutup + rekonsiliasi
POST /api/shifts/cash-movement {type:'in'|'out', amount, reason?} → catat kas masuk/keluar
GET  /api/shifts?status=&page=&limit=   riwayat (owner: semua; kasir: sendiri)
GET  /api/shifts/:id          detail + ringkasan
```

📅 Lanjutan: setoran tunai antar-shift, cetak laporan shift, laporan per-kasir.

---

## 5. Rencana Laporan Lain 📅
- **Per-kasir**: kontribusi penjualan tiap kasir.
- **Per-kategori / per-produk** lengkap.
- **Tren grafik** (harian/jam sibuk).
- **Ekspor** CSV/PDF.
- **Margin/laba** (butuh `cost_price` produk).

---

## 6. Edge Case
- Periode tanpa transaksi → nilai 0, top-products kosong.
- Zona waktu: rentang berbasis UTC; 📅 buat berbasis zona waktu toko.

---

## 7. Keterkaitan
- Order: [09-order-management](09-order-management.md)
- Dashboard owner: [17-ui-pages-and-navigation](17-ui-pages-and-navigation.md)
- Roadmap: [18-development-roadmap](18-development-roadmap.md)
