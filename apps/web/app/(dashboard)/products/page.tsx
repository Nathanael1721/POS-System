'use client';

import { useState } from 'react';
import type { Product, Category } from '@simplepos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useProducts } from '@/hooks/useProducts';
import { useStore } from '@/hooks/useStore';
import { apiClient, apiUpload, ApiClientError } from '@/lib/api-client';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';
import { LabelPrintModal } from '@/components/pos/LabelPrintModal';
import { Pagination } from '@/components/ui/pagination';

interface FormState {
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  stock: string;
  category_id: string;
  image_url: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: '',
  sku: '',
  barcode: '',
  price: '',
  stock: '0',
  category_id: '',
  image_url: '',
  is_active: true,
};

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_BYTES = 2 * 1024 * 1024;
const PAGE_SIZE = 12;

function stockBadge(stock: number, threshold: number) {
  if (stock <= 0) return <Badge variant="danger">Habis</Badge>;
  if (stock <= threshold) return <Badge variant="warning">Sisa {stock}</Badge>;
  return <Badge variant="success">{stock}</Badge>;
}

export default function ProductsPage() {
  const { products, categories, loading, refetch, refetchCategories } = useProducts({ limit: 100 });
  const { store } = useStore();
  const LOW_STOCK_THRESHOLD = store?.low_stock_threshold ?? 5;
  const [page, setPage] = useState(1);
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [labelFor, setLabelFor] = useState<Product | null>(null);

  function resetForm() {
    setForm(EMPTY);
    setFile(null);
    setFilePreview(null);
  }

  function edit(p: Product) {
    setFile(null);
    setFilePreview(null);
    setForm({
      id: p.id,
      name: p.name,
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      price: p.price,
      stock: String(p.stock),
      category_id: p.category_id ?? '',
      image_url: p.image_url ?? '',
      is_active: p.is_active,
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_MIME.includes(f.type)) {
      setError('Format gambar harus PNG, JPG, WEBP, atau GIF');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('Ukuran gambar maksimal 2 MB');
      return;
    }
    setError(null);
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        name: form.name,
        sku: form.sku || null,
        barcode: form.barcode.trim() || null,
        price: Number(form.price),
        stock: Number(form.stock),
        category_id: form.category_id || null,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
      };
      const saved = form.id
        ? await apiClient<Product>(`/api/products/${form.id}`, { method: 'PATCH', body })
        : await apiClient<Product>('/api/products', { method: 'POST', body });

      // Upload the selected image (if any) to the saved product.
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        await apiUpload(`/api/products/${saved.id}/image`, fd);
      }

      resetForm();
      void refetch();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal menyimpan produk');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (
      !window.confirm(
        'Nonaktifkan produk ini? Produk tidak akan tampil di kasir, tetapi riwayat order lama tetap tersimpan.',
      )
    )
      return;
    try {
      await apiClient(`/api/products/${id}`, { method: 'DELETE' });
      if (form.id === id) resetForm();
      void refetch();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Gagal menonaktifkan');
    }
  }

  const previewSrc = filePreview ?? resolveImageUrl(form.image_url);
  const lowCount = products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).length;
  const filtered = lowOnly
    ? products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD)
    : products;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-3 lg:overflow-hidden">
      {/* Left: catalog table */}
      <div className="min-w-0 lg:col-span-2 lg:overflow-y-auto">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">Produk</h1>
            <p className="text-xs text-gray-500">Kelola katalog produk toko Anda</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLowOnly((v) => !v)}
              aria-pressed={lowOnly}
              className={
                lowOnly
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100'
              }
            >
              <Icon name="alert-circle" className="h-3.5 w-3.5" />
              Stok rendah ({lowCount})
            </button>
            <Badge variant="neutral">{shown.length} produk</Badge>
          </div>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={8} />
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon="package"
              title={lowOnly ? 'Tidak ada produk berstok rendah' : 'Belum ada produk'}
              description={
                lowOnly
                  ? 'Semua produk masih di atas ambang stok rendah.'
                  : 'Tambahkan produk pertama Anda melalui form di samping.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-2.5 pl-5">Produk</th>
                    <th>SKU / Barcode</th>
                    <th className="text-right">Harga</th>
                    <th className="text-right">Stok</th>
                    <th className="pr-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shown.map((p) => {
                  const img = resolveImageUrl(p.image_url);
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-brand-50/40">
                      <td className="py-2.5 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-gray-100 text-gray-400">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(ev) => {
                                  (ev.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Icon name="package" className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-gray-800">{p.name}</div>
                            {!p.is_active && <Badge variant="neutral" className="mt-0.5">Nonaktif</Badge>}
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-500">
                        <div className="font-mono text-xs">{p.sku ?? '—'}</div>
                        <div className="font-mono text-[11px] text-gray-500">{p.barcode ?? ''}</div>
                      </td>
                      <td className="text-right font-medium tabular-nums text-gray-800">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="pr-1 text-right">{stockBadge(p.stock, LOW_STOCK_THRESHOLD)}</td>
                      <td className="pr-4 text-right">
                        <div className="flex justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => edit(p)}
                            title="Edit produk"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Icon name="pencil" className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLabelFor(p)}
                            title="Cetak label harga & barcode"
                            aria-label={`Cetak label ${p.name}`}
                          >
                            <Icon name="tag" className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => remove(p.id)}
                            title="Hapus produk"
                            aria-label={`Hapus ${p.name}`}
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="border-t border-gray-100">
              <Pagination
                page={safePage}
                total={filtered.length}
                totalPages={totalPages}
                onChange={setPage}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Right: categories + product form */}
      <div className="space-y-4 lg:overflow-y-auto lg:pb-4">
        <CategoryManager
          categories={categories}
          onChanged={async () => {
            await refetchCategories();
            void refetch();
          }}
        />

        <Card className="h-fit">
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Icon name={form.id ? 'pencil' : 'plus'} className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-gray-800">
                {form.id ? 'Edit produk' : 'Tambah produk baru'}
              </h2>
            </div>
            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-600/10">
                <Icon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={save} className="space-y-3">
              <Field label="Nama produk">
                <Input
                  placeholder="mis. Kopi Susu Botol"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="SKU">
                  <Input placeholder="opsional" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </Field>
                <Field label="Stok">
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Harga (Rp)">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Kategori">
                  <Select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">Tanpa kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Barcode">
                <Input
                  placeholder="scan / ketik"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="font-mono"
                />
              </Field>

              {/* Gambar: URL eksternal ATAU upload file ke database */}
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <Icon name="tag" className="h-3.5 w-3.5" />
                  Gambar produk
                </p>
                <Input
                  placeholder="URL gambar (https://…)"
                  value={form.image_url}
                  onChange={(e) => {
                    setForm({ ...form, image_url: e.target.value });
                    setFile(null);
                    setFilePreview(null);
                  }}
                />
                <p className="my-2 text-center text-[11px] text-gray-500">— atau —</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={onFileChange}
                  className="block w-full text-xs text-gray-600 file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-gray-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                />
                <p className="mt-2 text-[11px] text-gray-500">
                  Maks 2 MB · PNG/JPG/WEBP/GIF · tersimpan di database
                </p>
                {previewSrc && (
                  <div className="mt-2 flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt="Pratinjau gambar produk"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500/30"
                />
                Produk aktif (tampil di kasir)
              </label>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Menyimpan…' : form.id ? 'Perbarui Produk' : 'Tambah Produk'}
                </Button>
                {form.id && (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {labelFor && <LabelPrintModal product={labelFor} onClose={() => setLabelFor(null)} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

/** Inline create/delete management for product categories. */
function CategoryManager({
  categories,
  onChanged,
}: {
  categories: Category[];
  onChanged: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    setBusy(true);
    setErr(null);
    try {
      await apiClient('/api/categories', { method: 'POST', body: { name: value, sort_order: categories.length } });
      setName('');
      await onChanged();
    } catch (e2) {
      setErr(e2 instanceof ApiClientError ? e2.message : 'Gagal menambah kategori');
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!window.confirm('Hapus kategori ini? Produk terkait akan menjadi tanpa kategori.')) return;
    setErr(null);
    try {
      await apiClient(`/api/categories/${id}`, { method: 'DELETE' });
      await onChanged();
    } catch (e2) {
      setErr(e2 instanceof ApiClientError ? e2.message : 'Gagal menghapus kategori');
    }
  }

  return (
    <Card className="h-fit">
      <CardContent>
        <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Icon name="tag" className="h-4 w-4 text-brand-600" />
          Kategori
        </h2>
        <form onSubmit={add} className="flex gap-2">
          <Input placeholder="Nama kategori baru" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" size="md" disabled={busy || !name.trim()} className="shrink-0 px-3">
            <Icon name="plus" className="h-4 w-4" />
          </Button>
        </form>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.length === 0 ? (
            <span className="text-xs text-gray-500">Belum ada kategori.</span>
          ) : (
            categories.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-3 pr-2 text-xs font-medium text-gray-700"
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => del(c.id)}
                  className="grid h-4 w-4 place-items-center rounded-full text-gray-500 transition-colors hover:bg-red-100 hover:text-red-500"
                  aria-label={`Hapus kategori ${c.name}`}
                >
                  <Icon name="x" className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
