# 08 — POS Sales Transaction (Cart Kasir)

> **Status:** ✅ Terimplementasi (termasuk **scan barcode**) · 📅 keypad sentuh & split payment
> **Ringkasan:** Inti aplikasi — terminal kasir tempat staf memilih produk ke cart, mengatur qty/diskon/pajak, memilih metode bayar, lalu mengonfirmasi order yang diproses secara atomik di server.

> Catatan istilah: "cart" di sini adalah **keranjang kasir sementara di sisi klien**, bukan keranjang belanja e-commerce. Tidak ada akun pelanggan.

---

## 1. Requirement

- Kasir dapat menambah produk ke cart (klik/tap, 📅 scan barcode).
- Ubah qty, hapus item, atur diskon % & pajak %.
- Pratinjau total real-time (subtotal, diskon, pajak, total).
- Pilih metode bayar (tunai/QRIS/kartu); untuk tunai, input nominal dengan **shortcut & pemisah ribuan** dan tampil kembalian.
- Konfirmasi → order diproses **atomik** di server → struk muncul.

### Kriteria penerimaan
- Tidak bisa menambah melebihi stok.
- Tunai: tombol checkout aktif hanya bila nominal ≥ total.
- Non-tunai: nominal otomatis = total, butuh nomor referensi.
- Setelah sukses, cart bersih & struk siap dicetak.

---

## 2. Alur Transaksi

```
Cari/scan produk ──▶ ProductGrid ──▶ klik ──▶ cart (useCart)
   │
   ├─ atur qty / hapus / diskon% / pajak%
   ├─ pilih metode bayar
   │     ├─ cash: nominal (shortcut + ribuan) → kembalian
   │     └─ non-cash: referensi (amount = total)
   └─ "Charge" ──▶ POST /api/orders ──▶ {order, payment, receipt}
                       └─ tampilkan ReceiptModal (print/new order)
```

State cart dikelola hook `useCart` (client). Perhitungan total di klien **mencerminkan** aturan server agar pratinjau akurat; kebenaran final tetap dihitung & divalidasi server.

---

## 3. Perhitungan Total (klien & server identik)

```
subtotal        = Σ (unit_price × qty)
discount_amount = subtotal × discount_percent%
taxable         = subtotal − discount_amount
tax_amount      = taxable × tax_percent%
total           = taxable + tax_amount
```
Rincian & contoh angka: [11-discount-and-tax](11-discount-and-tax.md).

---

## 4. Input Pembayaran Tunai (✅ UX)

- **Shortcut uang**: tombol "Uang Pas" + nominal pembulatan terdekat di atas total (5k/10k/20k/50k/100k). Lihat `quickCashSuggestions()`.
- **Pemisah ribuan**: input diformat otomatis (`150000` → `150.000`) agar tidak salah baca; nilai mentah tetap angka.
- **Kembalian** dihitung real-time = nominal − total.

📅 Rencana: keypad numerik layar sentuh penuh, pembulatan otomatis (mis. ke 100 terdekat), split payment (tunai + non-tunai).

---

## 5. Payload Konfirmasi (POST /api/orders)

```json
{
  "items": [{ "product_id": "…", "quantity": 2 }],
  "discount_percent": 5,
  "tax_percent": 11,
  "payment_method": "cash",
  "amount_paid": 50000,
  "reference": null
}
```
Pemrosesan atomik 10 langkah di server: lihat [09-order-management](09-order-management.md) §3.

---

## 6. Edge Case
- **Stok berubah** saat konfirmasi (terjual kasir lain) → 409, kasir diminta ulang.
- **Produk nonaktif** masuk payload → ditolak.
- **Qty duplikat** produk sama → ditolak (gabungkan).
- **Tunai kurang** dari total → 422.
- **Non-tunai tanpa referensi** → 422.

---

## 7. Barcode ✅
- ✅ Kotak pencarian kasir merangkap input scanner: ketik/scan kode lalu **Enter** → lookup `GET /api/products/barcode/:code` → produk otomatis ditambahkan ke cart (qty +1).
- ✅ Validasi: produk nonaktif/stok habis ditolak dengan pesan; barcode tak dikenal → "tidak ditemukan".
- ✅ Mengetik teks biasa tetap memfilter grid (dual-purpose). Mempercepat checkout minimarket. Detail: [06-product-catalog](06-product-catalog.md) §6.

---

## 8. Keterkaitan
- Order & atomicity: [09-order-management](09-order-management.md)
- Pembayaran: [10-payment-system](10-payment-system.md)
- Diskon & pajak: [11-discount-and-tax](11-discount-and-tax.md)
- Struk: [12-receipt-and-printing](12-receipt-and-printing.md)
- UI: [17-ui-pages-and-navigation](17-ui-pages-and-navigation.md)
