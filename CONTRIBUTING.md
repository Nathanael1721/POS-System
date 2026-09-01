# Contributing to Simple-POS

Terima kasih ingin berkontribusi! Dokumen ini merangkum cara setup, konvensi
kode, testing, dan **proses rilis/versi** agar produk tetap konsisten dan siap
dipakai di dunia nyata.

---

## 1. Prasyarat

| Alat | Versi | Catatan |
|---|---|---|
| Node.js | ≥ 20 | via `nvm`/` volta` disarankan |
| pnpm | 9.x | `corepack enable` (versi dikunci `packageManager`) |
| Docker | any | PostgreSQL 16 + Redis 7 untuk lokal |

## 2. Setup lingkungan dev

```bash
git clone <repo> && cd POS-System
pnpm install
cp .env.example .env            # sesuaikan bila perlu
docker compose up -d postgres redis
pnpm --filter @simplepos/api migrate   # terapkan migrasi + seed
pnpm dev                        # web :3100, api :3001 (hot reload)
```

Akun demo (seed): `owner@Simple-POS.test / Owner123!` dan
`cashier@Simple-POS.test / Cashier123!`.

## 3. Struktur monorepo

```
apps/api        Hono REST API — routes → services → db (raw SQL postgres.js)
apps/web        Next.js 14 App Router — halaman + komponen UI
packages/shared Zod schemas + tipe — kontrak tunggal web ↔ api
docs/           Dokumentasi produk (Indonesia, 01–19) + superpowers/specs
```

## 4. Konvensi kode

- **TypeScript ketat** — tanpa `any`; `pnpm typecheck` wajib hijau.
- **SQL hanya di lapisan service** (`apps/api/src/services/`) — route hanya
  orkestrasi, validasi Zod, dan audit. Selalu parameterized (postgres.js tagged
  template) — dilarang interpolasi string.
- **Validasi**: skema Zod di `packages/shared/src/schemas/` dipakai lintas
  web & api (satu sumber kebenaran).
- **Logging**: `pino` — tanpa `console.log` di backend.
- **Komponen UI**: gunakan primitives di `apps/web/components/ui/` (Button, Input,
  Select, Badge, Modal, Icon, Skeleton, Pagination). Ikon = SVG inline di
  `icon.tsx` (gaya lucide) — hindari emoji untuk aksi.
- **Bahasa UI**: Bahasa Indonesia; istilah teknis (SKU, QRIS) tetap.
- **Migrasi DB**: forward-only, bernomor (`009_nama_fitur.sql`), wajib aman
  dijalankan ulang bila memungkinkan (`IF NOT EXISTS`). Tidak pernah mengubah
  migrasi lama yang sudah diterapkan.
- **Keamanan**: rahasia hanya via env; jangan pernah commit `.env`.

## 5. Testing

```bash
pnpm test            # semua workspace
pnpm --filter @simplepos/web test     # unit (utils, report-window)
pnpm --filter @simplepos/api test     # unit (money, order-number)
```

Ekspektasi per perubahan:

| Jenis perubahan | Minimal |
|---|---|
| Logika uang/stok/periode | unit test untuk kasus tepi (0, NaN, batas) |
| Endpoint baru | uji fungsional (curl/HTTP) sukses + error |
| UI | `pnpm lint` + `pnpm typecheck` + verifikasi visual |

CI (`.github/workflows/ci.yml`) menjalankan lint → test → build → Snyk pada
setiap PR ke `main`; PR tidak boleh di-merge sebelum hijau.

## 6. Alur kerja Git

1. Branch dari `main`: `feat/<nama>`, `fix/<nama>`, `docs/<nama>`.
2. Commit ringkas berbahasa Inggris/Indonesia konsisten, format bebas namun
   jelas (`feat: void order with stock restore`).
3. PR ke `main` — jelaskan **apa & kenapa**, cantumkan hasil verifikasi.
4. Squash-merge; deploy staging berjalan otomatis (lihat CI/CD di README).

## 7. Proses rilis & versi (SemVer)

Versi mengikuti [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **PATCH** (1.4.1): perbaikan bug tanpa perubahan kontrak.
- **MINOR** (1.5.0): fitur baru yang backwards-compatible (endpoint/field baru).
- **MAJOR** (2.0.0): breaking change (kontrak API, skema yang merusak kompatibilitas).

Langkah rilis:

1. Pastikan `main` hijau (CI lengkap).
2. Naikkan `version` **seragam** di 4 `package.json` (root, `apps/api`,
   `apps/web`, `packages/shared`) dan label versi di `components/layout/Sidebar.tsx`.
3. Tambahkan entri di **[CHANGELOG.md](CHANGELOG.md)** (kategori Added/Changed/Fixed,
   tulis *apa yang berubah bagi pengguna*, bukan diff teknis semata).
4. Perbarui status di `docs/18-development-roadmap.md` (📅 → ✅ bila selesai).
5. Commit `release: v1.x.y`, tag `git tag -a v1.x.y`, push tag —
   pipeline deploy produksi (approval manual) berjalan dari release.

## 8. Pelaporan bug & ide fitur

Buka issue dengan template: **langkah reproduksi**, **perilaku terjadi**,
**perilaku diharapkan**, plus tangkapan layar/log bila ada. Untuk ide fitur,
periksa dulu [roadmap](docs/18-development-roadmap.md) dan
[future features](docs/19-future-features.md) agar tidak tumpang tindih.
