# UI Redesign — Modern Clean SaaS

**Tanggal:** 2026-08-27
**Status:** Terimplementasi (menunggu review user)
**Lingkup:** Seluruh frontend `apps/web` — tanpa perubahan backend/API.

## Latar belakang

UI lama dinilai kurang menarik dan kurang intuitif: hierarki visual lemah (flat,
tanpa elevasi), spacing sempit, tanpa ikon navigasi, tanpa indikator status stok,
loading/empty state polos, dan bahasa label campur Inggris/Indonesia.

## Arah desain

**Modern Clean SaaS** (referensi: Stripe/Linear/shadcn) — tema terang bersih,
palet teal + warna semantik, ikon garis (gaya lucide, inline SVG tanpa dependensi),
elevasi halus, spacing lega. Dipilih karena paling aman untuk usability pemilik
toko & kasir. Bahasa UI dibakukan ke **Bahasa Indonesia**.

## Design tokens

- `tailwind.config.ts`: skala warna `brand-50..950` (teal, DEFAULT `#0d9488`),
  font stack system-ui, shadow `card` / `card-hover` / `pop`.
- `globals.css`: latar `gray-100`, seleksi brand, scrollbar tipis, sembunyikan
  spinner input angka (UI memakai stepper eksplisit), CSS cetak struk/label dipertahankan.

## Primitives baru (`components/ui/`)

| Komponen | Fungsi |
|---|---|
| `icon.tsx` | Set ikon SVG inline (stroke, 24×24) — navigasi, aksi, status |
| `badge.tsx` | Pill status semantik: neutral/brand/success/warning/danger (+dot) |
| `skeleton.tsx` | Placeholder loading (grid produk & baris tabel) |
| `empty-state.tsx` | Ikon + judul + petunjuk saat data kosong |
| `modal.tsx` | Shell modal: backdrop blur, header + tombol tutup, tutup via Esc/klik luar |

`button/input/select/card` di-upgrade: fokus ring brand, state hover/active,
`IconInput` (ikon di dalam field), select dengan chevron.

## Perubahan per halaman

- **Shell** — Sidebar 256px: logo mark, nav ber-ikon + item aktiv pill brand +
  info toko di bawah. Header: breadcrumb kiri, chip user (avatar inisial + nama +
  peran) + tombol Keluar kanan. Komponen `Breadcrumb.tsx` dihapus (digabung ke Header).
- **Login** — latar blob dekoratif, logo mark, kartu terpusat, label + hint demo.
- **Kasir** — toolbar pencarian ber-ikon + filter kategori; feedback scan/error
  berupa chip berwarna + ikon; kartu produk dengan badge stok berwarna
  (hijau/amber/merah), overlay "Stok Habis", hover lift; panel keranjang dengan
  stepper qty −/+, ringkasan dalam blok abu, metode bayar segmented control
  (Tunai/QRIS/Kartu ber-ikon), chip uang cepat, input "Rp", baris kembalian
  disorot hijau, tombol besar "Bayar Rp …".
- **Produk** — tabel dalam kartu (header uppercase, hover baris, badge stok,
  aksi ikon dengan tooltip; muncul jelas saat hover), form ber-label di kanan.
- **Pesanan** — badge status (Lunas/Menunggu/Batal), tabel dalam kartu, panel
  detail dengan ringkasan pembayaran.
- **Laporan** — segmented control periode (Harian/Mingguan/Bulanan), kartu
  statistik ber-ikon, tabel produk terlaris dengan peringkat + bar relatif.
- **Shift** — badge status Terbuka/Tertutup, selisih kas berwarna, panel detail
  rapi; ShiftBar dengan indikator "shift aktif" berdenyut.
- **Pengaturan** — label Indonesia, Field konsisten, notice sukses/error ber-ikon.
- **Modal** (struk, tutup shift, kas masuk/keluar, label cetak) — shell konsisten,
  struk bergaya nota thermal (garis putus-putus, mono nomor).

## Prinsip usability yang diterapkan (Nielsen)

1. *Visibility of system status* — skeleton loading, tombol berstatus memproses,
   chip umpan balik scan, badge stok, indikator shift aktif.
2. *Match with the real world* — seluruh label berbahasa Indonesia, format Rp,
   istilah kasir (Uang Pas, Kembalian, Laci Kas).
3. *Consistency & standards* — satu set Button/Input/Select/Modal/Badge di semua
   halaman; angka uang memakai `tabular-nums`.
4. *Error prevention* — tombol Bayar nonaktif sampai input valid, stepper qty
   dibatasi stok, konfirmasi hapus tetap ada.
5. *Recognition over recall* — ikon + teks di nav & aksi, tooltip pada aksi ikon.
6. *Aesthetic & minimalist* — satu aksen utama, hierarki tipografi jelas,
   aksi sekunder menyala saat hover baris.

## Ronde 3 (2026-09-01) — kelengkapan operasional & best practice

### Bug diperbaiki
- **Hapus produk kini soft-delete** (`is_active=false`): sebelumnya `DELETE FROM products`
  mentah yang pasti gagal FK (`order_items.product_id`) begitu produk punya riwayat
  transaksi; riwayat order tetap utuh, idempoten, dan PATCH bisa mengaktifkan kembali.

### Fitur baru
- **Void/batal order** (`POST /api/orders/:id/void`): transaksional — status jadi
  `cancelled`, stok dikembalikan, audit `order.void` dengan alasan. Owner bisa void
  semua; kasir hanya miliknya. Void ganda ditolak (409). UI: tombol di detail Pesanan
  dengan modal alasan.
- **Audit log viewer** (`GET /api/audit-logs`, owner-only): paginated + filter aksi
  (ILIKE) + nama user (JOIN); halaman `/audit` dengan payload expandable.
- **Laporan**: `GET /api/reports/trend` (7 hari / 8 minggu / 12 bulan / 5 tahun,
  via `generate_series` + LEFT JOIN) dan `GET /api/reports/export` (CSV attachment,
  RFC 4180 escape). UI: grafik bar CSS murni + tombol Export CSV (`apiDownload`).
- **Pengaturan toko nyata** (migration 008): `default_tax_percent` (auto-terisi di
  keranjang sekali), `low_stock_threshold` (dipakai badge kasir, filter produk,
  dashboard), `auto_print_receipt` (dialog cetak terbuka otomatis pasca-bayar).
- **Dashboard beranda owner** (`/dashboard`): penjualan/pesanan/rata-rata hari ini,
  top-3 produk, shift berjalan, watchlist stok rendah. Root `/` redirect per role.
- **Pagination**: Orders & Shift server-side (limit 10); Products client-side
  (limit 100 fetch, 12/halaman, kompatibel dengan filter stok rendah).
- **Ketahanan**: `app/error.tsx` global error boundary; Modal kini focus-trap +
  restore focus; logika jendela laporan diekstrak ke `lib/report-window.ts`.

### Test
- Web: 20 unit test (`lib/utils`, `lib/report-window` — jendela UTC, normalize,
  step, format uang, quick-cash). API: 6 test util tetap hijau.

### Verifikasi fungsional (curl)
- Void: stok 298→295→298 (kembali), void ganda 409, audit tercatat.
- Soft-delete produk ber-riwayat: 204, is_active=false, PATCH reaktivasi OK.
- Trend/CSV/audit-logs/store PATCH semuanya 200 dengan payload benar.

### Sengaja tidak masuk ronde ini
- ESC-POS thermal: browser tidak bisa bicara langsung ke USB/serial printer —
  butuh service Node terpisah; alternatifnya print browser (sudah ada + auto-print).
- Cookie httpOnly + CSRF, PWA offline, multi-store, payment gateway, promo engine:
  perubahan arsitektur skala besar, dicadangkan sebagai fase berikutnya.

## Ronde 2 (2026-08-31) — perbaikan bug & improvisasi ala POS komersial

Referensi riset: Toast (hold order), Square (numpad tender), Moka (QRIS & cepat),
ASAS/LS Retail (shortcut keyboard).

### Bug diperbaiki
1. Pencarian produk memukul API per ketikan → sekarang debounce 250 ms.
2. Mengosongkan input qty menghapus baris keranjang → clamp ke 1 (min), tanpa auto-hapus.
3. Diskon/pajak NaN saat mengetik (mis. "1-") merusak preview → di-guard + clamp 0–100.
4. Enter pada teks bebas memicu error "barcode tidak ditemukan" → hanya deretan digit ≥4
   yang diperlakukan sebagai scan barcode.
5. docker-compose memetakan web ke 3000 padahal dev script 3100 (web tak terjangkau) →
   mapping `3100:3100` + `FRONTEND_URL` disesuaikan; README diperbarui.

### Fitur baru (improvisasi dari POS komersial)
- **Tahan keranjang (hold order)** — parkir keranjang aktif, layani pelanggan lain,
  lanjutkan lewat chip "Tiket ditahan"; bertahan di localStorage; qty di-clamp ke stok
  terbaru saat dilanjutkan; keranjang aktif otomatis ditahan saat resume (swap).
- **NumPad uang tunai** — keypad angka (komponen lama yang tak terpakai, kini aktif)
  dengan tombol toggle di samping input jumlah bayar.
- **Shortcut keyboard** — F2 fokus cari/scan, F4 tahan keranjang, F8 bayar
  (hint kbd tampil di toolbar; tombol bayar diakses via ref agar state disabled tetap dihormati).
- **Chip kategori cepat** — baris pill di atas grid menggantikan dropdown filter.
- **Cetak ulang struk** — tombol di detail Pesanan membangun ulang Receipt dari data order.
- **Filter stok rendah** — chip toggle di halaman Produk (ambang 5, konsisten dengan badge).

## Verifikasi

- `pnpm --filter @simplepos/api test` ✅ (6/6)
- `pnpm -r typecheck` ✅ (shared, api, web)
- `pnpm --filter @simplepos/web lint` ✅ (0 warning/error)
- Screenshot visual di browser untuk Login, Kasir, Produk, Laporan ✅
  (catatan: gambar produk demo yang memang tidak ada di DB tetap tampil placeholder)

## Keputusan terbuka / lanjutan

- Gaya alternatif yang sempat dipertimbangkan: Bold Retail Playful, Dark POS
  Terminal — token terpusat di `tailwind.config.ts` sehingga ganti arah mudah.
- Belum ada dark mode; `color-scheme: light` eksplisit.
- Belum diimplementasi: split payment, park order lintas perangkat (server-side),
  auto-print struk setelah checkout (opsional per toko).
