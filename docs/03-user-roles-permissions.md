# 03 — User Roles & Permissions

> **Status:** ✅ Terimplementasi
> **Ringkasan:** Sistem memakai dua peran — `owner` dan `cashier` — dengan RBAC ditegakkan di server melalui middleware. Kasir dibatasi pada operasi transaksi; pemilik punya akses penuh.

---

## 1. Requirement

- Setiap pengguna memiliki tepat satu peran: `owner` atau `cashier`.
- Pengguna terikat pada satu toko (`store_id`).
- **Owner**: akses penuh — kelola produk, kategori, lihat semua laporan, kelola kasir, atur toko.
- **Cashier**: akses terbatas — memproses order, melihat order/transaksi miliknya sendiri.
- Penegakan izin **wajib di server**, bukan sekadar menyembunyikan menu di UI.

### Kriteria penerimaan
- Kasir yang mengakses endpoint khusus owner menerima **403 Forbidden**.
- Kasir hanya melihat order yang `cashier_id`-nya = dirinya.
- Tidak ada cara klien mengubah perannya sendiri.

---

## 2. Matriks Izin

| Kapabilitas | owner | cashier |
|-------------|:-----:|:-------:|
| Login / logout / lihat profil | ✅ | ✅ |
| Lihat daftar produk & kategori | ✅ | ✅ |
| Buat/ubah/hapus produk | ✅ | ❌ |
| Buat/hapus kategori | ✅ | ❌ |
| Buat order (transaksi) | ✅ | ✅ |
| Lihat **semua** order toko | ✅ | ❌ |
| Lihat order **sendiri** | ✅ | ✅ |
| Lihat laporan (`/reports/*`) | ✅ | ❌ |
| Kelola staf/kasir (`/users`) | ✅ | ❌ |
| Ubah profil & password sendiri | ✅ | ✅ |
| Pengaturan toko (pajak, dll) 📅 | ✅ | ❌ |
| Buka/tutup shift ✅ | ✅ | ✅ |
| Lihat riwayat shift | ✅ semua | ✅ sendiri |

---

## 3. Desain Teknis

### Penegakan (server)
- `authMiddleware` memverifikasi JWT, memuat user dari DB, menolak user nonaktif, lalu menempelkan `user` ke context.
- `requireRole(...roles)` (factory) mengembalikan 403 bila peran tidak diizinkan. Helper `requireOwner = requireRole('owner')`.

Contoh wiring (apps/api):
```ts
api.use('*', authMiddleware, userRateLimit);
productRoutes.post('/', requireOwner, ...);      // hanya owner
reportRoutes.use('*', requireOwner);             // seluruh /reports owner-only
```

### Pembatasan data kasir
Pada `listOrders`/`getOrderById`, bila `user.role === 'cashier'` query difilter `cashier_id = user.id`; akses ke order milik kasir lain dianggap **404 Not Found** (tidak membocorkan keberadaannya).

---

## 4. Edge Case & Validasi
- **User tanpa store_id**: operasi yang butuh toko menolak dengan error validasi.
- **User dinonaktifkan** (`is_active = false`): token lama ditolak saat verifikasi (user dimuat ulang dari DB tiap request).
- **Eskalasi peran**: peran tidak pernah diambil dari payload klien; selalu dari kolom `users.role` di DB.
- **Owner menonaktifkan diri sendiri**: dilarang (lihat [15-settings-and-staff-management](15-settings-and-staff-management.md)).

---

## 5. Status Implementasi vs Rencana
- ✅ Dua peran owner/cashier, matriks di atas, penegakan server.
- 📅 Peran tambahan (mis. `supervisor`/`manager`) bila multi-store hadir.
- 📅 Izin granular per-toko saat multi-store.

---

## 6. Keterkaitan
- Auth: [04-authentication-security](04-authentication-security.md)
- Kelola staf: [15-settings-and-staff-management](15-settings-and-staff-management.md)
- Order (pembatasan kasir): [09-order-management](09-order-management.md)
