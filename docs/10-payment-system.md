# 10 — Payment System

> **Status:** ✅ Tunai/QRIS/kartu manual · 📅 integrasi payment gateway
> **Ringkasan:** Mencatat pembayaran per order: nominal dibayar, kembalian (untuk tunai), metode, dan nomor referensi (untuk non-tunai). Integrasi gateway online direncanakan secara generik.

---

## 1. Requirement

- Mendukung metode: **cash**, **qris**, **card**.
- **Tunai**: hitung kembalian = nominal − total; nominal harus ≥ total.
- **Non-tunai**: nominal = total, simpan **nomor referensi** (dari EDC/QRIS).
- Satu order memiliki **satu** pembayaran.
- Pembayaran dicatat atomik bersama order.

### Kriteria penerimaan
- Tunai < total → 422.
- Non-tunai tanpa referensi → 422.
- `change_given` benar untuk tunai; 0 untuk non-tunai.

---

## 2. Model Data (payments)

| Kolom | Keterangan |
|-------|-----------|
| `order_id` | 1:1 ke order (UNIQUE) |
| `amount_paid` | nominal diterima |
| `change_given` | kembalian (tunai) |
| `method` | cash/qris/card |
| `reference` | referensi non-tunai |
| `paid_at` | waktu bayar |

---

## 3. Aturan Bisnis

```
cash:     amount_paid >= total      → change = amount_paid − total
non-cash: amount_paid == total      → change = 0, reference wajib
```
Perhitungan memakai integer sen (lihat [05-database-design](05-database-design.md) §4).

---

## 4. Metode Saat Ini (✅ manual)

| Metode | Cara kerja sekarang |
|--------|---------------------|
| **cash** | kasir input nominal diterima; sistem hitung kembalian |
| **qris** | pelanggan scan QRIS statis toko; kasir input **nomor referensi** |
| **card** | gesek di mesin EDC terpisah; kasir input **nomor referensi/approval** |

Konfirmasi pembayaran masih **manual** (kasir menandai lunas). Tidak ada panggilan ke pihak ketiga.

---

## 5. Integrasi Payment Gateway 📅 (generik)

Visi: pembayaran non-tunai terkonfirmasi otomatis tanpa input manual.

Alur target (vendor-agnostik):
```
1. Buat order pending → minta "charge" ke gateway (nominal, order_id)
2. Gateway kembalikan QRIS dinamis / instruksi bayar
3. Pelanggan bayar
4. Gateway kirim WEBHOOK → API verifikasi tanda tangan → tandai order paid
5. Struk/e-receipt dikirim
```

Kebutuhan teknis 📅:
- Endpoint `POST /api/payments/charge` & `POST /api/payments/webhook`.
- Verifikasi signature webhook, idempotensi (cegah double-confirm).
- Status pembayaran: `pending → settled → failed/expired`.
- Penyimpanan `gateway_reference`, `gateway_status`.

> Vendor belum diputuskan; dokumen ditulis netral. Saat dipilih, cukup mengisi adaptor sesuai kontrak vendor.

---

## 6. Edge Case
- **Lebih bayar non-tunai**: ditolak (harus pas).
- **Pembayaran ganda**: dicegah UNIQUE `payments.order_id` + (📅) idempotensi webhook.
- **Refund/void** 📅: lihat [09-order-management](09-order-management.md).
- **Split payment** 📅: dua metode dalam satu order.

---

## 7. Keterkaitan
- Order: [09-order-management](09-order-management.md)
- Diskon & pajak (komponen total): [11-discount-and-tax](11-discount-and-tax.md)
- Struk: [12-receipt-and-printing](12-receipt-and-printing.md)
