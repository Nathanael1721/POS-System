# 12 — Receipt & Printing

> **Status:** ✅ Struk data JSON + cetak browser · 📅 thermal ESC-POS & e-receipt
> **Ringkasan:** Setiap transaksi menghasilkan objek struk (JSON) yang ditampilkan dan dapat dicetak via dialog browser. Target lanjutan: printer thermal ESC-POS (58/80mm) dan struk digital via WhatsApp/Email.

---

## 1. Requirement

- Setiap order menghasilkan **data struk** lengkap.
- Kasir dapat **mencetak nota** setelah transaksi.
- Struk memuat: identitas toko, nomor & waktu order, kasir, daftar item, subtotal/diskon/pajak/total, pembayaran & kembalian.
- 📅 Cetak ke printer **thermal** kasir.
- 📅 Kirim **e-receipt** ke pelanggan.

### Kriteria penerimaan
- Struk muncul otomatis setelah order sukses.
- Tombol cetak menghasilkan output hanya struk (bukan seluruh UI).

---

## 2. Struktur Data Struk (✅)

`Receipt` (dari `@simplepos/shared`):
```ts
{
  order_number, store_name, cashier_name,
  items: [{ product_name, unit_price, quantity, subtotal }],
  subtotal, discount_percent, discount_amount,
  tax_percent, tax_amount, total,
  payment_method, amount_paid, change_given,
  reference, created_at
}
```
Dikembalikan oleh `POST /api/orders` di field `receipt`. Tidak ada PDF di server (JSON saja, sesuai spesifikasi).

---

## 3. Cetak via Browser (✅)

- Komponen `ReceiptModal` menampilkan struk; tombol **Print Nota** memanggil `window.print()`.
- CSS `@media print` menyembunyikan seluruh aplikasi dan hanya menampilkan elemen `.printable-receipt`.
- Cocok untuk printer A4/biasa atau "Save as PDF".

---

## 4. Cetak Thermal ESC-POS 📅

Target printer struk kasir (58mm & 80mm):
- **Format**: lebar karakter 32 (58mm) / 48 (48–80mm), font monospace, potong otomatis.
- **Pendekatan**:
  - Web: gunakan layout CSS khusus lebar 58/80mm untuk printer thermal mode "driver".
  - Native/agen cetak: kirim perintah **ESC-POS** (raw) via bridge lokal / WebUSB / aplikasi pendamping.
- **Elemen tambahan**: logo toko, alamat, NPWP/footer ucapan terima kasih, QR untuk e-receipt.

### Label harga & barcode ✅
- ✅ Cetak label berisi **nama + harga + barcode** (CODE128 via JsBarcode) dari halaman Products.
- ✅ Pilih jumlah salinan; tata letak grid; cetak via browser (hanya lembar label, lewat CSS `.printable-label`).
- 📅 Preset ukuran label (mis. 33×15mm), template kustom, dan dukungan EAN-13.

Usulan pengaturan toko 📅: header/footer struk, tampilkan logo, ukuran kertas default.

---

## 5. e-Receipt (WhatsApp / Email) 📅

- Setelah transaksi, opsi kirim struk digital ke nomor WA / email pelanggan.
- **Email**: layanan transaksional (mis. Resend/SMTP) — template HTML struk.
- **WhatsApp**: via penyedia WhatsApp Business API.
- Struk digital berisi tautan/QR ke versi web struk.
- Kebutuhan: simpan kontak pelanggan opsional per transaksi (tanpa membuat akun pelanggan penuh).

---

## 6. Edge Case
- Cetak saat printer tak tersedia → fallback dialog browser.
- Re-print dari riwayat order 📅 (cetak ulang struk lama).
- Karakter non-ASCII pada printer thermal → mapping/encoding khusus 📅.

---

## 7. Status Implementasi vs Rencana
- ✅ Data struk JSON, modal struk, cetak browser, CSS print.
- 📅 ESC-POS 58/80mm, logo/footer toko, e-receipt WA/Email, re-print.

---

## 8. Keterkaitan
- Order/struk dihasilkan: [09-order-management](09-order-management.md)
- Pengaturan toko: [15-settings-and-staff-management](15-settings-and-staff-management.md)
- Future (notifikasi/e-receipt): [19-future-features](19-future-features.md)
