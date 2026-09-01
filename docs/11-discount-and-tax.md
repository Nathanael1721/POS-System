# 11 — Discount & Tax

> **Status:** ✅ Diskon % per-order & pajak % per-order · 📅 diskon item, voucher, member, pajak default toko
> **Ringkasan:** Saat ini mendukung diskon persen dan pajak persen di level order dengan urutan kalkulasi baku. Visi produk menambah diskon per-item, voucher/kode promo, diskon member, dan tarif pajak default per-toko.

---

## 1. Requirement

### Saat ini (✅)
- Diskon persentase pada keseluruhan order (`discount_percent`).
- Pajak persentase pada nilai setelah diskon (`tax_percent`).
- Nilai diskon & pajak tersimpan sebagai nominal (`discount_amount`, `tax_amount`) di order.

### Visi (📅)
- Diskon per **item**.
- **Voucher / kode promo** (nominal atau persen, syarat minimum, kuota, periode).
- **Diskon member** (harga khusus pelanggan terdaftar).
- **Pajak default per-toko** (mis. PPN 11%) yang otomatis terisi & dapat di-override saat transaksi.

---

## 2. Urutan Kalkulasi (baku)

```
1. subtotal        = Σ (unit_price × qty)
2. discount_amount = round(subtotal × discount_percent / 100)
3. taxable         = subtotal − discount_amount
4. tax_amount      = round(taxable × tax_percent / 100)
5. total           = taxable + tax_amount
```

> **Penting:** pajak dihitung **setelah** diskon (atas nilai kena pajak). Pembulatan ke sen terdekat memakai integer (hindari galat float).

### Contoh
Subtotal 100.000, diskon 10%, pajak 11%:
```
discount = 10.000 → taxable = 90.000 → tax = 9.900 → total = 99.900
```

---

## 3. Pajak Default per-Toko 📅

- Tambah `store_settings.default_tax_percent` (mis. 11).
- Saat membuka transaksi, `tax_percent` terisi default toko.
- Kasir/owner dapat **override** per transaksi (sesuai keputusan produk).
- 📅 Opsi "harga sudah termasuk pajak" (tax-inclusive) untuk display.

---

## 4. Engine Promo 📅 (visi lengkap)

### a. Diskon per-item
- Field diskon pada baris cart (persen/nominal).
- `order_items` menyimpan `discount_amount` per baris.

### b. Voucher / kode promo
Usulan tabel `promotions` / `vouchers` 📅:
| Kolom | Keterangan |
|-------|-----------|
| `code` | kode unik |
| `type` | percent / fixed |
| `value` | besar diskon |
| `min_subtotal` | syarat minimum |
| `max_discount` | batas nominal |
| `quota`, `used` | kuota pemakaian |
| `starts_at`, `ends_at` | periode aktif |
| `is_active` | status |

Validasi saat checkout: aktif, dalam periode, kuota tersisa, memenuhi minimum.

### c. Diskon member
- Tabel `members` 📅 (nama, kontak, tier).
- Harga/diskon khusus per tier; akumulasi poin (lihat [19-future-features](19-future-features.md) — loyalty).

### Prioritas penerapan (saat banyak diskon)
Usulan: diskon item → diskon order → voucher → pajak. Aturan tumpukan (stackable / eksklusif) ditetapkan di engine.

---

## 5. Edge Case
- Diskon > 100% → ditolak (batas 0–100).
- Pajak/diskon menghasilkan pecahan sen → dibulatkan konsisten.
- Voucher kedaluwarsa/kuota habis 📅 → 422 dengan pesan jelas.
- Total ≤ 0 setelah diskon ekstrem 📅 → kebijakan minimum (mis. tidak boleh negatif).

---

## 6. Status Implementasi vs Rencana
- ✅ `discount_percent` & `tax_percent` per-order + perhitungan baku.
- 📅 default pajak toko, diskon item, voucher, member, prioritas tumpukan.

---

## 7. Keterkaitan
- Transaksi: [08-pos-sales-transaction](08-pos-sales-transaction.md)
- Pembayaran: [10-payment-system](10-payment-system.md)
- Future (loyalty/member): [19-future-features](19-future-features.md)
