# 09 — Order Management

> **Status:** ✅ Terimplementasi · 📅 void/refund & status lanjutan
> **Ringkasan:** Pembuatan order bersifat **atomik** (semua langkah berhasil atau rollback). Order dapat dilihat (list & detail) dengan paginasi & filter; kasir hanya melihat order miliknya.

---

## 1. Requirement

- Order dibuat dalam **satu transaksi database**.
- Setiap order punya **nomor unik** ber-format dan status.
- Daftar order dapat difilter tanggal & status, terpaginasi.
- Kasir melihat order **miliknya**, owner melihat **semua**.
- Detail order menampilkan item & pembayaran.

### Kriteria penerimaan
- Kegagalan di langkah mana pun → tidak ada order/stok/pembayaran parsial.
- Nomor order tidak pernah duplikat.
- Kasir mengakses order kasir lain → 404.

---

## 2. Status Order

| Status | Arti | Saat ini |
|--------|------|----------|
| `pending` | dibuat, belum lunas | (disediakan skema) |
| `paid` | lunas | ✅ order POS langsung `paid` |
| `cancelled` | dibatalkan | 📅 alur void |

> Pada alur POS sekarang, order dibuat langsung `paid` (bayar di tempat). Status `pending` & `cancelled` disiapkan untuk alur masa depan (mis. tahan transaksi / void).

---

## 3. Pemrosesan Atomik (10 langkah, ✅)

Di dalam `withTransaction`:
0. ✅ **Wajib shift aktif**: caller harus punya shift terbuka, jika tidak → 409 "Buka shift dulu". Order ditaut `shift_id`. Lihat [13-sales-reporting](13-sales-reporting.md) §4.
1. Validasi semua `product_id` ada, aktif, satu toko (lock `FOR UPDATE`).
2. Validasi `stock >= quantity` tiap item.
3. Hitung subtotal per item.
4. Hitung subtotal order, diskon, pajak, total.
5. INSERT `orders` (status `paid`, nomor order).
6. INSERT semua `order_items` (snapshot nama & harga).
7. UPDATE stok produk (guard anti-oversell).
8. INSERT `payments` (amount, kembalian, metode, referensi).
9. Tulis `audit_logs` (`order.confirm`) — atomik dengan order.
10. Kembalikan `{ order, payment, receipt }`.

Bila langkah mana pun gagal → seluruh transaksi rollback.

---

## 4. Nomor Order

Format: `{STORE_PREFIX}-{YYYYMMDD}-{5-digit}` — contoh `SDS-20260628-00001`.
- Prefix diturunkan dari nama toko (3 huruf).
- Sekuens **reset harian per toko**.
- UNIQUE constraint + hitung-dalam-transaksi menjaga keunikan saat race.

---

## 5. Endpoint

| Method | Path | Role | Keterangan |
|--------|------|------|-----------|
| POST | `/api/orders` | owner/cashier | buat order → `{order, payment, receipt}` |
| GET | `/api/orders?date=&status=&page=&limit=` | owner: semua / cashier: sendiri | daftar |
| GET | `/api/orders/:id` | pemilik order/owner | detail + items + payment |

### Contoh respons (ringkas)
```json
{
  "order": { "order_number": "SDS-20260628-00001", "status": "paid", "total": "47500.00" },
  "payment": { "amount_paid": "50000.00", "change_given": "2500.00", "method": "cash" },
  "receipt": { "...": "lihat 12-receipt-and-printing" }
}
```

---

## 6. Edge Case
- Konkurensi stok → 409 (lihat [07-stock-management](07-stock-management.md)).
- Filter `date` memakai zona waktu server; lihat juga [13-sales-reporting](13-sales-reporting.md).
- User tanpa `store_id` → 422.

---

## 7. Status Implementasi vs Rencana
- ✅ Buat (atomik), list (filter+paginasi+RBAC), detail.
- 📅 **Void/cancel** order (`cancelled`) dengan pengembalian stok & audit.
- 📅 **Refund**/retur sebagian.
- 📅 **Hold/tahan** transaksi (status `pending`, lanjut kemudian).

---

## 8. Keterkaitan
- Transaksi kasir: [08-pos-sales-transaction](08-pos-sales-transaction.md)
- Pembayaran: [10-payment-system](10-payment-system.md)
- Audit: [14-audit-log](14-audit-log.md)
