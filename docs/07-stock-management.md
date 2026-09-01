# 07 — Stock Management

> **Status:** 🟡 Sebagian — pengurangan stok atomik ✅; alert/opname/penyesuaian 📅
> **Ringkasan:** Stok produk dikurangi secara atomik di dalam transaksi order dengan proteksi anti-oversell. Fitur lanjutan (alert stok rendah, penyesuaian manual, stok opname, restock) direncanakan.

---

## 1. Requirement

- Stok berkurang **tepat** sesuai jumlah terjual saat order dikonfirmasi.
- Tidak boleh menjual melebihi stok (no oversell), termasuk saat transaksi bersamaan.
- Perubahan stok harus **atomik** dengan pembuatan order (semua berhasil atau semua batal).
- 📅 Owner mendapat peringatan saat stok mendekati habis.
- 📅 Owner dapat menyesuaikan stok (koreksi, barang masuk, rusak/hilang) dengan jejak.

### Kriteria penerimaan
- Order dengan qty > stok → ditolak (409 Conflict), tidak ada perubahan data.
- Dua order bersamaan atas produk stok 1 → hanya satu berhasil.

---

## 2. Desain Teknis — Pengurangan Atomik (✅)

Di dalam transaksi `createOrder` (lihat [08-pos-sales-transaction](08-pos-sales-transaction.md)):

1. Produk dikunci baris: `SELECT … FOR UPDATE` untuk mencegah race.
2. Validasi `stock >= quantity` per item.
3. Update dengan **guard**:
   ```sql
   UPDATE products
   SET stock = stock - $qty, updated_at = now()
   WHERE id = $id AND stock >= $qty
   RETURNING stock;
   ```
   Jika 0 baris terupdate (stok berubah di tengah race) → lempar `ConflictError` → seluruh transaksi rollback.

Hasil: stok tidak pernah negatif; konsistensi terjaga bahkan di bawah konkurensi.

---

## 3. Alert Stok Rendah 📅

- Tambah ambang `low_stock_threshold` (per produk atau default toko).
- Owner dashboard menampilkan daftar produk `stock <= threshold`.
- Notifikasi (lihat [19-future-features](19-future-features.md)) saat stok menyentuh ambang.

---

## 4. Penyesuaian Stok & Opname 📅

- **Stock adjustment**: koreksi manual (+/−) dengan alasan (barang masuk, rusak, hilang). Tercatat di audit & tabel `stock_movements` 📅.
- **Stock opname**: input hitungan fisik → sistem hitung selisih dengan stok sistem → terapkan koreksi.
- **Restock / barang masuk**: pencatatan penambahan stok (tanpa modul supplier penuh — supplier tetap out-of-scope, lihat [19-future-features](19-future-features.md)).

Usulan tabel `stock_movements` 📅:
| Kolom | Keterangan |
|-------|-----------|
| `product_id` | produk |
| `type` | sale / adjustment / restock / opname |
| `qty_change` | +/− |
| `reason` | teks |
| `ref_order_id` | bila berasal dari penjualan |
| `user_id`, `created_at` | jejak |

---

## 5. Edge Case
- Produk `is_active = false` tidak bisa masuk transaksi.
- Produk tanpa pelacakan stok 📅 (`track_stock = false`, mis. jasa) — dilewati dari guard stok.
- Qty duplikat di cart ditolak agar matematika stok jelas (gabungkan qty).

---

## 6. Status Implementasi vs Rencana
- ✅ Pengurangan stok atomik + guard anti-oversell.
- 📅 Alert stok rendah, penyesuaian manual, opname, restock, `stock_movements`.

---

## 7. Keterkaitan
- Transaksi: [08-pos-sales-transaction](08-pos-sales-transaction.md)
- Produk: [06-product-catalog](06-product-catalog.md)
- Notifikasi: [19-future-features](19-future-features.md)
