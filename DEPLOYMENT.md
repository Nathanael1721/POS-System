# Panduan Deploy — Simple-POS

Arsitektur serverless yang didukung sejak **v1.5.0**:

| Komponen | Layanan | Catatan |
|---|---|---|
| Web (Next.js) | **Vercel** | project terpisah, Root Directory `apps/web` |
| API (Hono) | **Vercel** | project terpisah, Root Directory `apps/api`, fungsi serverless via `api/index.ts` + `vercel.json` |
| PostgreSQL | **Supabase** | WAJIB pakai **connection pooler** (port 6543) |
| Redis | **Upstash** | untuk refresh token + rate limit; pakai URL `rediss://` (TCP) |

> Alternatif non-serverless (Docker/Fly.io) tetap didukung — entry `src/index.ts`
> tidak berubah. Panduan ini khusus Vercel + Supabase + Upstash.

---

## 0. Prasyarat

- Akun [Vercel](https://vercel.com) (gratis), [Supabase](https://supabase.com) (gratis),
  [Upstash](https://upstash.com) (gratis) — ketiganya login dengan GitHub.
- Repo sudah ter-push ke GitHub (sudah: `Nathanael1721/POS-System`).
- `gh` CLI ter-login (untuk contoh perintah; bisa juga lewat dashboard web).

## 1. Supabase (database)

1. Buat project baru (pilih region terdekat, mis. Singapore).
2. Buka **Project Settings → Database → Connection string → URI**.
3. Pilih tab **Connection pooling** dan salin URI **Transaction mode** — bentuknya:
   ```
   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   > ⚠️ **Penting**: dari Vercel WAJIB pakai URL pooler (port **6543**) — fungsi
   > serverless Vercel tidak punya rute IPv6 ke endpoint database langsung
   > (port 5432), dan transaction pooler menuntut `prepare: false` yang sudah
   > ditangani otomatis oleh `apps/api/src/db/client.ts`.
4. Simpan sebagai `DATABASE_URL` (untuk langkah migrasi & Vercel).

### Jalankan migrasi + seed (dari komputer lokal, sekali saja)

```bash
# .env sementara di root, atau export langsung:
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-...pooler.supabase.com:6543/postgres" \
  pnpm --filter @simplepos/api migrate
```

Anda akan melihat 8 migrasi diterapkan (`001` s/d `008`) beserta data seed
(owner & kasir demo). Verifikasi di Supabase **Table Editor** — tabel `users`,
`products`, dst. sudah terisi.

## 2. Upstash (Redis)

1. Buat database Redis di Upstash (region sama dengan Supabase idealnya).
2. Salin **Endpoint TCP** (bukan REST): URL `rediss://default:<password>@...:6379`.
3. Simpan sebagai `REDIS_URL`.

> Redis dipakai untuk menyimpan refresh token (rotasi) dan rate limiting login —
> aplikasi tidak akan start tanpa ini.

## 3. Vercel — Project API (`simple-pos-api`)

1. **Add New → Project → Import** repo `Nathanael1721/POS-System`.
2. **Root Directory**: `apps/api` → centang **"Include files outside the root
   directory"** (monorepo — butuh `packages/shared`).
3. Framework Preset: **Other**. Build Command: *kosongkan*. Output Directory: *kosongkan*.
4. Environment Variables (Production):
   | Variabel | Nilai |
   |---|---|
   | `DATABASE_URL` | URI pooler Supabase (langkah 1) |
   | `REDIS_URL` | `rediss://…` Upstash (langkah 2) |
   | `ACCESS_TOKEN_SECRET` | string acak ≥32 karakter |
   | `REFRESH_TOKEN_SECRET` | string acak ≥32 karakter |
   | `FRONTEND_URL` | `https://<nama-project-web>.vercel.app` (isi setelah langkah 4 — bisa diedit belakangan) |
   | `NODE_ENV` | `production` |
   | `SENTRY_DSN` | *(opsional, kosongkan)* |
5. Deploy. Uji: buka `https://<api>.vercel.app/health` → `{"status":"ok"}`.

## 4. Vercel — Project Web (`simple-pos-web`)

1. Import repo yang sama, **Root Directory**: `apps/web` (+ centang include
   files outside root).
2. Framework Preset: **Next.js** (terdeteksi otomatis; build `next build`).
3. Environment Variables:
   | Variabel | Nilai |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<nama-project-api>.vercel.app` |
4. Deploy, lalu **kembali ke project API** dan set `FRONTEND_URL` ke URL
   production web ini, kemudian **Redeploy** project API (agar CORS aktif).
5. Buka web → login dengan akun seed. Selesai 🎉

## 5. Gotcha umum (penyebab "tidak bisa live")

| Gejala | Penyebab | Solusi |
|---|---|---|
| `prepared statement "…" does not exist` | memakai pooler Supabase 6543 dengan prepared statements | sudah diperbaiki di v1.5.0 (`prepare:false` otomatis untuk port 6543) |
| `ENOTFOUND` / `Connection refused` ke DB | memakai URI direct port 5432 dari Vercel (IPv6) | ganti ke **pooler URI** 6543 |
| API 404 / tidak jalan di Vercel | tidak ada entry serverless (sebelum v1.5.0) | `apps/api/api/index.ts` + `vercel.json` rewrite sudah tersedia |
| CORS error di browser web | `FRONTEND_URL` di project API belum sesuai URL web | samakan & redeploy API |
| Build web gagal `Cannot find module '@simplepos/shared'` | Root Directory tanpa "include outside root" | centang opsi tersebut saat import |
| Login gagal setelah deploy | lupa jalankan migrasi ke Supabase | jalankan `pnpm --filter @simplepos/api migrate` dengan `DATABASE_URL` Supabase |
| Function crash: `Invalid environment configuration` | env wajib belum lengkap di Vercel | lengkapi tabel langkah 3 |
| Preview deployment (URL acak `*.vercel.app`) ditolak CORS | CORS hanya mengizinkan `FRONTEND_URL` produksi | gunakan production deployment, atau set domain khusus |

## 6. Setelah live (opsional tapi disarankan)

- **Custom domain** di Vercel (web & API), lalu perbarui `FRONTEND_URL` dan
  `NEXT_PUBLIC_API_URL`.
- Rotasi secret `ACCESS_TOKEN_SECRET`/`REFRESH_TOKEN_SECRET` secara berkala.
- Aktifkan **Supabase PITR/backup** dan pantau pemakaian di dashboard Upstash.
- Set `SENTRY_DSN` untuk observability error.
- Rilis berikutnya cukup `git push` — kedua project Vercel auto-deploy dari `main`.

## 7. Keterkaitan

- Arsitektur: [docs/02-system-architecture](docs/02-system-architecture.md)
- Konvensi rilis: [CONTRIBUTING.md](CONTRIBUTING.md)
- Riwayat versi: [CHANGELOG.md](CHANGELOG.md)
