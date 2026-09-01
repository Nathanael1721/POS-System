# 04 — Authentication & Security

> **Status:** ✅ Terimplementasi
> **Ringkasan:** Autentikasi email+password dengan JWT access token (15 menit) dan refresh token (7 hari) yang disimpan & dirotasi di Redis. Dilengkapi rate limiting, hashing bcrypt, dan praktik keamanan standar.

---

## 1. Requirement

- Login dengan email + password.
- **Access token** berumur pendek (15 menit) untuk otorisasi request.
- **Refresh token** berumur panjang (7 hari) untuk memperbarui access token tanpa login ulang.
- Refresh **dirotasi** setiap dipakai (token lama dicabut).
- Logout mencabut seluruh refresh token pengguna.
- Proteksi brute-force pada login.
- Password tidak pernah disimpan dalam bentuk plain.

### Kriteria penerimaan
- Access token kedaluwarsa otomatis setelah 15 menit.
- Refresh token yang sudah dipakai/dicabut tidak bisa dipakai lagi (401).
- Login gagal 6× dari satu IP dalam 15 menit → 429.

---

## 2. Alur Token

```
LOGIN
  email+password ──▶ verifikasi bcrypt ──▶ terbitkan:
     access_token  (JWT, 15m, secret ACCESS_TOKEN_SECRET)
     refresh_token (JWT, 7d, secret REFRESH_TOKEN_SECRET)
       └─ hash SHA-256 disimpan di Redis:
          key  refresh:{user_id}:{token_hash}
          ttl  7 hari

REFRESH
  refresh_token ──▶ verifikasi tanda tangan + cek ada di Redis
     ├─ hapus key lama (rotasi)
     └─ terbitkan access + refresh baru

LOGOUT
  hapus semua key refresh:{user_id}:* di Redis
```

### Isi payload
- **Access**: `{ sub: userId, store_id, role, type: 'access' }`, `exp` 15m, issuer `Simple-POS`.
- **Refresh**: `{ sub: userId, type: 'refresh', jti }`, `exp` 7d.

Algoritma: **HS256**. Library: `jose`.

---

## 3. Endpoint

| Method | Path | Auth | Keterangan |
|--------|------|------|-----------|
| POST | `/api/auth/login` | publik (rate-limited) | `{email, password}` → `{access_token, refresh_token, user}` |
| POST | `/api/auth/refresh` | publik | `{refresh_token}` → `{access_token, refresh_token}` (rotasi) |
| POST | `/api/auth/logout` | Bearer | mencabut semua refresh token |
| GET | `/api/auth/me` | Bearer | data user saat ini |

Detail kontrak: [16-api-design](16-api-design.md).

---

## 4. Rate Limiting (Redis)

| Cakupan | Batas | Kunci |
|---------|-------|-------|
| `POST /api/auth/login` | 5 / 15 menit | per **IP** |
| Endpoint lain | 100 / menit | per **user** (fallback IP) |

- Implementasi fixed-window (`INCR` + `EXPIRE`).
- Respons 429 menyertakan header `Retry-After`.
- **Fail-open**: jika Redis tak tersedia, request tetap dilayani dan error dicatat (ketersediaan > pembatasan).

---

## 5. Keamanan Password & Transport

- ✅ **bcrypt cost 12** untuk hash password.
- ✅ Perbandingan login selalu menjalankan bcrypt (dummy hash bila email tak ada) untuk meredam _timing attack_ / enumerasi email.
- ✅ Setelah **ganti password**, seluruh refresh token dicabut (logout paksa sesi lain).
- ✅ **CORS** hanya mengizinkan origin `FRONTEND_URL`.
- ✅ **secure-headers** middleware aktif.
- ✅ Semua query **parameterized** (anti SQL injection).
- ✅ Secret hanya dari environment variable, tidak di kode. Secret token minimal 32 karakter (divalidasi saat boot).
- ✅ Stack trace tidak pernah bocor pada respons produksi.

---

## 6. Edge Case & Validasi
- **Authorization header** tidak ada/format salah → 401.
- **Token kedaluwarsa/invalid** → 401, klien otomatis mencoba refresh sekali (lihat `lib/api-client`).
- **Refresh tidak ada di Redis** (kedaluwarsa/dicabut/sudah dirotasi) → 401.
- **User nonaktif saat refresh** → key dihapus, 401.

---

## 7. Status Implementasi vs Rencana
- ✅ Login, refresh berotasi, logout, me, rate limit, bcrypt.
- 📅 **Reset password via email** (lupa password saat belum login) — butuh layanan email + tabel token reset. Saat ini reset dilakukan dari menu Settings setelah login.
- 📅 2FA / OTP untuk owner.
- 📅 Audit percobaan login gagal beruntun.

---

## 8. Keterkaitan
- Peran & izin: [03-user-roles-permissions](03-user-roles-permissions.md)
- Settings (ganti password): [15-settings-and-staff-management](15-settings-and-staff-management.md)
- Audit: [14-audit-log](14-audit-log.md)
