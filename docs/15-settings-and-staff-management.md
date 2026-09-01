# 15 — Settings & Staff Management

> **Status:** ✅ Profil, ganti password, kelola kasir · 📅 reset via email, pengaturan toko
> **Ringkasan:** Menu Settings memungkinkan pengguna mengubah nama & password sendiri, dan memungkinkan owner membuat/menonaktifkan akun kasir. Pengaturan toko (pajak, struk) direncanakan.

---

## 1. Requirement

- Setiap pengguna dapat **mengubah nama** tampilan & **ganti password** sendiri.
- Ganti password memverifikasi password lama; setelah berhasil, sesi lain dicabut.
- **Owner** dapat **membuat** akun staf (kasir/owner), **melihat daftar**, dan **menonaktifkan**.
- 📅 Owner mengatur **profil toko** (nama, alamat, pajak default, header/footer struk).

### Kriteria penerimaan
- Ganti password dengan password lama salah → 401.
- Password baru = lama → ditolak (422).
- Kasir mengakses kelola user → 403.
- Owner tidak bisa menonaktifkan dirinya sendiri.

---

## 2. Endpoint (✅)

| Method | Path | Role | Keterangan |
|--------|------|------|-----------|
| PATCH | `/api/users/me` | semua | ubah nama sendiri |
| POST | `/api/users/me/password` | semua | ganti password (cabut refresh) |
| GET | `/api/users` | owner | daftar staf toko |
| POST | `/api/users` | owner | buat staf (`role` default cashier) |
| DELETE | `/api/users/:id` | owner | nonaktifkan staf |

### Contoh — buat kasir
```http
POST /api/users
{ "name": "Budi", "email": "budi@toko.test", "password": "rahasia8+", "role": "cashier" }
```

---

## 3. Aturan Bisnis
- Email **unik global**; duplikat → 409 Conflict.
- Password di-hash bcrypt cost 12.
- Ganti password → `authService.logout` mencabut semua refresh token user (paksa login ulang di perangkat lain).
- Nonaktif = `is_active = false` (soft-disable), bukan hapus — menjaga integritas riwayat & audit.
- Pembuatan staf otomatis di-scope ke `store_id` owner.

---

## 4. "Lupa Password" (interpretasi)
- ✅ **Saat sudah login**: ganti password dari menu Settings (butuh password lama).
- 📅 **Saat belum login** (true forgot-password): kirim tautan reset via email + tabel token reset berkadaluarsa. Butuh layanan email; lihat [04-authentication-security](04-authentication-security.md) §7.
- 📅 Alternatif: **owner mereset** password kasir (set password sementara).

---

## 5. Pengaturan Toko 🟡 (sebagian)

✅ Terimplementasi:
- **Toggle Fitur Shift** (`stores.shift_enabled`, default OFF) — owner mengaktifkan/menonaktifkan sistem shift & laci kas di **Settings → Pengaturan toko**. Lihat [13-sales-reporting](13-sales-reporting.md) §4.
- Endpoint: `GET /api/store` (semua, untuk membaca `shift_enabled`), `PATCH /api/store` (owner).

📅 Rencana pengaturan lain (kolom pada `stores` / tabel `store_settings`):
| Pengaturan | Contoh |
|------------|--------|
| `default_tax_percent` | 11 |
| `receipt_header` / `receipt_footer` | teks struk |
| `logo_url` | logo di struk |
| `low_stock_threshold` | ambang alert |
| `receipt_paper` | 58mm / 80mm / A4 |
| `currency` | IDR (sudah ada di `stores`) |

---

## 6. Edge Case
- Update nama kosong → 422.
- Hapus/nonaktif user terakhir owner 📅 → cegah agar toko tidak kehilangan admin.

---

## 7. Status Implementasi vs Rencana
- ✅ Edit nama, ganti password, buat/list/nonaktif staf.
- 📅 Reset via email, owner-reset, pengaturan toko (pajak/struk/logo).

---

## 8. Keterkaitan
- Peran: [03-user-roles-permissions](03-user-roles-permissions.md)
- Auth: [04-authentication-security](04-authentication-security.md)
- Pajak default & struk: [11-discount-and-tax](11-discount-and-tax.md), [12-receipt-and-printing](12-receipt-and-printing.md)
