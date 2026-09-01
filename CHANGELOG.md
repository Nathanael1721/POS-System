# Changelog

Semua perubahan penting pada **Simple-POS** didokumentasikan di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan
versi mengikuti [Semantic Versioning](https://semver.org/lang/id/) —
`MAJOR.MINOR.PATCH` untuk fitur/struktur, `PATCH` untuk perbaikan bug.

---

## [1.4.0] — 2026-09-01 — Kelengkapan Operasional

Fokus: menjadikan sistem utuh secara operasional — salah input bisa dibatalkan,
setiap aksi bisa diaudit, dan pemilik toko punya ringkasan satu layar.

### Added
- **Void/batal order** — `POST /api/orders/:id/void` dengan alasan (wajib).
  Satu transaksi database: status `paid` → `cancelled`, stok produk dikembalikan,
  dan entri audit `order.void` ditulis. Owner dapat membatalkan order siapa pun;
  kasir hanya order miliknya sendiri. Void ganda ditolak `409`.
  UI: tombol *Batalkan Order* pada detail Pesanan + modal alasan.
- **Audit log viewer** — `GET /api/audit-logs` (owner-only, paginated, filter
  `action` ILIKE, `user_id`; JOIN nama user). Halaman baru **Audit** berisi tabel
  waktu/pengguna/aksi/IP dengan payload JSON yang dapat dibuka.
- **Grafik tren pendapatan** — `GET /api/reports/trend` mengembalikan deret
  bucket (7 hari / 8 minggu / 12 bulan / 5 tahun sesuai periode) via
  `generate_series` + LEFT JOIN. UI: bar chart CSS murni (tanpa library chart).
- **Export CSV laporan** — `GET /api/reports/export?period=&date=` mengirim
  berkas `text/csv` (attachment, escaping RFC 4180) berisi seluruh order pada
  jendela periode beserta nama kasir. UI: tombol *Export CSV* di halaman Laporan.
- **Pengaturan toko nyata** (migration `008_store_settings.sql`):
  - `default_tax_percent` — pajak default per toko, terisi otomatis sekali di
    keranjang kasir;
  - `low_stock_threshold` — ambang stok rendah konfigurabel, dipakai badge
    kartu produk kasir, filter halaman Produk, dan dashboard;
  - `auto_print_receipt` — dialog cetak struk terbuka otomatis setelah pembayaran.
- **Dashboard Beranda owner** (`/dashboard`) — penjualan/pesanan/rata-rata hari
  ini, top-3 produk, shift berjalan, dan watchlist stok rendah. Root `/` kini
  mengarahkan owner ke dashboard, kasir langsung ke terminal.
- **Pagination di UI** — Pesanan & Shift server-side (10/halaman); Produk
  client-side (12/halaman) agar tetap kompatibel dengan filter stok rendah.
- **Error boundary global** (`app/error.tsx`) — komponen yang crash tidak lagi
  menjadikan seluruh aplikasi layar putih; tersedia tombol coba lagi.
- **Focus trap pada Modal** — fokus awal masuk panel, Tab bersiklus di dalam,
  fokus dikembalikan ke elemen pemanggil saat modal ditutup.
- **20 unit test frontend** — `lib/utils` (format uang, quick-cash, digits) dan
  `lib/report-window` (jendela periode UTC, normalisasi, step; logika diekstrak
  dari halaman agar dapat diuji).

### Fixed
- **Hapus produk kini soft-delete** — sebelumnya `DELETE FROM products` mentah
  yang pasti gagal constraint FK (`order_items.product_id`) begitu produk punya
  riwayat transaksi, dan berpotensi merusak riwayat. Sekarang `is_active=false`
  (idempoten, dapat diaktifkan kembali); riwayat order tetap utuh.

### Changed
- **Nama produk menjadi "Simple-POS"** di seluruh antarmuka dan dokumentasi
  (judul halaman, wordmark sidebar & login, README, docs). Identifier teknis
  internal — nama paket npm `@simplepos/*`, nama database, container compose,
  dan aplikasi Fly.io — tetap tidak berubah demi kompatibilitas.
- Halaman Produk: teks konfirmasi hapus menjelaskan perilaku nonaktif.
- Logika jendela laporan dipindah ke `apps/web/lib/report-window.ts`.

---

## [1.3.0] — 2026-08-31 — Laporan Historis & Desain Responsive

Fokus: melihat laporan periode lampau dan aplikasi nyaman dipakai di layar sempit.

### Added
- **Periode Tahunan** pada laporan (`period=yearly`) — dari skema shared sampai
  service SQL.
- **Navigator jendela periode** di halaman Laporan: tombol ‹ › (mundur/maju satu
  periode), label jendela berbahasa Indonesia (mis. "Agustus 2026",
  "25 – 31 Agustus 2026") + rentang eksplisit, input tanggal untuk lompat langsung
  (maks hari ini), tombol *Kembali ke kini*, dan tombol › dinonaktifkan pada
  periode terkini.
- **Navigasi mobile** — sidebar berubah menjadi drawer slide-in (tombol hamburger
  di header, backdrop, tutup otomatis saat memilih menu) di bawah breakpoint `lg`.
- **Kasir mobile** — layout satu kolom dengan *bar total menempel di bawah*
  (jumlah item + total + tombol Keranjang) yang membuka panel keranjang sebagai
  bottom sheet.
- Tabel-tabel (Produk/Pesanan/Shift/Laporan/Staf) dibungkus scroll horizontal
  dengan lebar minimum; kontainer halaman menumpuk di mobile.

---

## [1.2.0] — 2026-08-31 — Alur Kerja Kasir & Perbaikan Bug

Fokus: pola terbaik dari POS komersial (Toast, Square, Moka, ASAS/LS Retail)
serta perbaikan bug hasil audit kode + uji fungsional API.

### Added
- **Tahan keranjang (hold order)** — parkir keranjang aktif (tombol Tahan atau
  `F4`), layani pelanggan lain, lanjutkan kapan pun melalui chip *Tiket ditahan*.
  Persisten di `localStorage`; qty di-clamp ke stok terbaru saat dilanjutkan;
  keranjang aktif otomatis ditahan saat resume (swap, tidak ada yang hilang).
- **NumPad uang tunai** — keypad angka (komponen lama yang belum terpakai, kini
  aktif dan disegarkan) dengan tombol toggle di samping input jumlah bayar.
- **Pintasan keyboard** — `F2` fokus cari/scan, `F4` tahan keranjang, `F8` bayar;
  hint kbd tampil di toolbar.
- **Chip kategori cepat** — deretan pill di atas grid produk menggantikan dropdown.
- **Cetak ulang struk** — tombol pada detail Pesanan membangun ulang struk dari
  data order tersimpan.
- **Filter stok rendah** — chip toggle di halaman Produk dengan penghitung.

### Fixed
- Pencarian produk memukul API **per ketikan** → didebounce 250 ms.
- Mengosongkan input qty **menghapus baris keranjang diam-diam** → kini di-clamp
  minimum 1; penghapusan hanya lewat tombol kurang/hapus.
- Diskon/pajak NaN saat mengetik (mis. "1-") merusak preview total → di-guard
  dan di-clamp 0–100.
- Enter pada teks bebas memicu error "barcode tidak ditemukan" → hanya deretan
  digit ≥4 yang diperlakukan sebagai scan; teks bebas cukup difilter live.
- `docker-compose.yml` memetakan web ke port 3000 padahal dev script berjalan di
  3100 (web tak terjangkau via compose) + `FRONTEND_URL` & README diselaraskan.

---

## [1.1.0] — 2026-08-27 — Redesign UI "Modern Clean SaaS"

Fokus: tampilan yang menarik, intuitif, dan konsisten dengan kaidah usability
(heuristik Nielsen) di seluruh halaman. Tanpa perubahan backend.

### Added
- **Design tokens** — skala warna brand penuh (`brand-50..950`, teal), shadow
  bertingkat (`card`/`card-hover`/`pop`), font stack system-ui.
- **Primitives baru** — `Icon` (set SVG inline gaya lucide, tanpa dependensi),
  `Badge` status semantik (success/warning/danger/brand/neutral + dot),
  `Skeleton` loading (grid & tabel), `EmptyState`, dan `Modal` shell
  (backdrop blur, tutup via Esc/klik luar).
- **Badge status stok** di kartu produk & tabel (hijau/amber/merah) dan
  **overlay "Stok Habis"** pada kartu yang habis.
- **Halaman Kasir** — kartu produk dengan hover lift, stepper qty −/+, ringkasan
  keranjang dalam blok abu, metode bayar segmented control Tunai/QRIS/Kartu
  ber-ikon, chip uang cepat, input "Rp" berprefiks, baris kembalian disorot hijau,
  umpan balik scan berupa chip berwarna + ikon.
- **Halaman Produk/Pesanan/Laporan/Shift/Pengaturan** — tabel dalam kartu, badge
  status pesanan (Lunas/Menunggu/Batal), aksi ikon dengan tooltip, kartu statistik
  ber-ikon, peringkat produk terlaris + bar relatif, form ber-label.
- **Login** — latar blob dekoratif, logo mark, kartu terpusat, hint akun demo.
- Struk (ReceiptModal) bergaya nota thermal dengan garis putus-putus.

### Changed
- **Bahasa UI dibakukan ke Bahasa Indonesia** (sebelumnya campur Inggris).
- Sidebar: nav ber-ikon + item aktif pill; Header: breadcrumb + chip user.
- Angka uang memakai `tabular-nums` agar rata kolom.

---

## [1.0.0] — 2026-06-27 — MVP POS

Rilis awal: sistem POS produksi-grade untuk toko ritel kecil.

- **Auth** — email/password (bcrypt cost 12), JWT access 15 menit + refresh 7
  hari dirotasi di Redis, RBAC owner/kasir, rate limit login 5×/15 menit per IP.
- **Katalog** — CRUD produk & kategori, SKU, harga, stok, gambar (URL atau
  upload ≤2 MB ke database), field barcode.
- **Transaksi** — order atomik (validasi stok → insert order/item → kurangi stok
  → pembayaran → audit dalam satu transaksi) dengan guard anti-oversell
  (`SELECT … FOR UPDATE` + `UPDATE … WHERE stock >= qty`), nomor order
  `{PREFIX}-{YYYYMMDD}-{NNNNN}` reset harian per toko, diskon %, pajak %,
  pembayaran tunai/QRIS/kartu + kembalian, struk JSON + cetak browser.
- **Shift & laci kas** (opsional per toko) — buka/tutup shift dengan modal awal,
  kas masuk/keluar, rekonsiliasi hitung akhir + selisih, riwayat.
- **Laporan** — ringkasan harian/mingguan/bulanan + top-5 produk (owner-only).
- **Audit log** — setiap aksi pengubah state tercatat (user, toko, aksi, payload
  JSON, IP); pembatalan login-void ikut transaksional.
- **Scan barcode** — scan-to-add di kasir, pencarian via barcode, cetak label
  harga + barcode (CODE128).
- **Pengaturan** — profil, ganti kata sandi, kelola kasir, toggle shift.
- **Infrastruktur** — monorepo Turborepo + pnpm, Next.js 14 + Hono + PostgreSQL
  (postgres.js raw SQL) + Redis, docker-compose lokal, Dockerfile multi-stage
  non-root, CI GitHub Actions (lint → test → build → Snyk), deploy staging/prod
  ke Fly.io via GHCR dengan gerbang approval.

---

## Legenda Kategori

| Kategori | Arti |
|---|---|
| **Added** | Fitur baru |
| **Changed** | Perubahan pada fungsionalitas existing |
| **Fixed** | Perbaikan bug |
| **Removed / Security** | Penghapusan fitur / perbaikan keamanan (belum ada hingga v1.4.0) |
