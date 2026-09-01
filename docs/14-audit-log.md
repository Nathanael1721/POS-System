# 14 — Audit Log

> **Status:** ✅ Terimplementasi · 📅 UI penelusuran & retensi
> **Ringkasan:** Setiap aksi yang mengubah state (login, CRUD produk, konfirmasi order, kelola user, dll) ditulis ke `audit_logs` dengan pelaku, toko, aksi, snapshot payload (JSONB), dan IP.

---

## 1. Requirement

- Catat setiap aksi penting dengan: `user_id`, `store_id`, `action`, `payload` (snapshot), `ip_address`, `created_at`.
- Penulisan audit **tidak boleh menggagalkan** operasi bisnis yang sudah sukses... kecuali bila memang bagian dari transaksi (mis. konfirmasi order, audit ikut atomik).
- Owner dapat menelusuri jejak audit 📅.

### Kriteria penerimaan
- Konfirmasi order menulis `order.confirm` **dalam transaksi** order (atomik).
- Kegagalan menulis audit non-transaksional dicatat ke log, tidak melempar error ke pengguna.

---

## 2. Aksi yang Dicatat (✅)

| Action | Pemicu |
|--------|--------|
| `auth.login` | login berhasil |
| `auth.logout` | logout |
| `product.create` / `product.update` / `product.delete` | CRUD produk |
| `category.create` / `category.delete` | kelola kategori |
| `order.confirm` | order dibuat (atomik) |
| `user.create` | owner membuat staf |
| `user.update_profile` | ubah nama |
| `user.change_password` | ganti password |
| `user.deactivate` | nonaktifkan staf |

📅 Rencana: `order.void`, `stock.adjust`, `shift.open/close`, `voucher.apply`.

---

## 3. Model Data (audit_logs)

| Kolom | Keterangan |
|-------|-----------|
| `user_id` | pelaku (nullable bila user dihapus → SET NULL) |
| `store_id` | konteks toko |
| `action` | string aksi (mis. `product.update`) |
| `payload` | JSONB snapshot detail aksi |
| `ip_address` | dari header proxy (x-forwarded-for / x-real-ip), maks 45 char |
| `created_at` | waktu |

Index: `idx_audit_logs_store_created(store_id, created_at)`.

---

## 4. Desain Teknis
- Helper `recordAudit(entry, tx?)`:
  - Dengan `tx` → ikut transaksi (mis. order), error merambat (integritas).
  - Tanpa `tx` → best-effort, kegagalan hanya dicatat ke logger.
- IP diambil dari header proxy umum dengan fallback.
- Payload contoh (`order.confirm`): `{ order_id, order_number, total, item_count }`.

---

## 5. Edge Case & Keamanan
- Data sensitif (password) **tidak** dimasukkan ke payload; logger juga me-redaksi field rahasia.
- IP dipangkas ke panjang aman (IPv6).
- Audit tidak bisa diubah dari endpoint (append-only secara praktik).

---

## 6. Status Implementasi vs Rencana
- ✅ Penulisan audit untuk semua aksi di tabel §2.
- 📅 **Halaman penelusuran audit** untuk owner (filter aksi/tanggal/pengguna).
- 📅 **Kebijakan retensi** (arsip/purge berkala).
- 📅 Export audit.

---

## 7. Keterkaitan
- Order: [09-order-management](09-order-management.md)
- Keamanan: [04-authentication-security](04-authentication-security.md)
- Settings: [15-settings-and-staff-management](15-settings-and-staff-management.md)
