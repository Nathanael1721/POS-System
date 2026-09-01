'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicUser, Store, UpdateStoreInput } from '@simplepos/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { tokenStore } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);

  useEffect(() => {
    setMe(tokenStore.getUser());
  }, []);

  if (!me) {
    return (
      <div className="grid h-full place-items-center p-6">
        <p className="text-sm text-gray-400">Memuat…</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4">
        <h1 className="text-lg font-bold tracking-tight text-gray-900">Pengaturan</h1>
        <p className="text-xs text-gray-400">Profil, keamanan, toko, dan staf</p>
      </div>
      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        <ProfileSection me={me} onUpdated={setMe} />
        <PasswordSection onChanged={() => router.replace('/login')} />
        {me.role === 'owner' && me.store_id && (
          <div className="md:col-span-2">
            <StoreSettingsSection />
          </div>
        )}
        {me.role === 'owner' && me.store_id && (
          <div className="md:col-span-2">
            <CashiersSection />
          </div>
        )}
      </div>
    </div>
  );
}

function Notice({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  return (
    <p
      className={
        kind === 'error'
          ? 'flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-600/10'
          : 'flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-600/10'
      }
    >
      <Icon name={kind === 'error' ? 'alert-circle' : 'check-circle'} className="h-4 w-4 shrink-0" />
      {text}
    </p>
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

/** Edit own display name. */
function ProfileSection({ me, onUpdated }: { me: PublicUser; onUpdated: (u: PublicUser) => void }) {
  const [name, setName] = useState(me.name);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const { user } = await apiClient<{ user: PublicUser }>('/api/users/me', {
        method: 'PATCH',
        body: { name },
      });
      tokenStore.setUser(user);
      onUpdated(user);
      setMsg({ kind: 'success', text: 'Profil berhasil diperbarui.' });
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiClientError ? err.message : 'Gagal memperbarui profil' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil Saya</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-3">
          <Field label="Email">
            <Input value={me.email} disabled />
          </Field>
          <Field label="Nama tampilan">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          {msg && <Notice kind={msg.kind} text={msg.text} />}
          <Button type="submit" disabled={saving || name.trim() === ''}>
            {saving ? 'Menyimpan…' : 'Simpan Nama'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Change password (the "forgot/reset password" flow for a signed-in user). */
function PasswordSection({ onChanged }: { onChanged: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ kind: 'error', text: 'Kata sandi baru dan konfirmasinya tidak sama.' });
      return;
    }
    setSaving(true);
    try {
      await apiClient('/api/users/me/password', {
        method: 'POST',
        body: { current_password: current, new_password: next },
      });
      tokenStore.clear();
      setMsg({ kind: 'success', text: 'Kata sandi diubah. Silakan masuk kembali.' });
      setTimeout(onChanged, 800);
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiClientError ? err.message : 'Gagal mengubah kata sandi' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ganti Kata Sandi</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-3">
          <Field label="Kata sandi saat ini">
            <Input
              type="password"
              placeholder="••••••••"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Kata sandi baru">
            <Input
              type="password"
              placeholder="min. 8 karakter"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Konfirmasi kata sandi baru">
            <Input
              type="password"
              placeholder="ulangi kata sandi baru"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          {msg && <Notice kind={msg.kind} text={msg.text} />}
          <Button type="submit" disabled={saving}>
            {saving ? 'Mengubah…' : 'Ubah Kata Sandi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Owner-only: store-level settings (shift toggle, tax default, stock alert, auto-print). */
function StoreSettingsSection() {
  const [store, setStore] = useState<Store | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setStore(await apiClient<Store>('/api/store'));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: UpdateStoreInput, successText: string) {
    setMsg(null);
    setBusy(true);
    try {
      const updated = await apiClient<Store>('/api/store', { method: 'PATCH', body });
      setStore(updated);
      setMsg({ kind: 'success', text: successText });
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiClientError ? err.message : 'Gagal menyimpan' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Toko</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Shift toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Icon name="clock" className="h-4 w-4 text-brand-600" />
              Fitur Shift &amp; Laci Kas
            </p>
            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-gray-500">
              Saat aktif, kasir wajib membuka shift sebelum bertransaksi dan dapat merekonsiliasi
              kas. Muat ulang halaman agar menu Shift menyesuaikan.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={store?.shift_enabled ?? false}
            aria-label="Fitur shift dan laci kas"
            disabled={busy || !store}
            onClick={() =>
              patch(
                { shift_enabled: !(store?.shift_enabled ?? false) },
                `Fitur shift ${store?.shift_enabled ? 'dinonaktifkan' : 'diaktifkan'}.`,
              )
            }
            className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 ${
              store?.shift_enabled ? 'bg-brand-600' : 'bg-gray-300'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                store?.shift_enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
          {/* Default tax */}
          <Field label="Pajak default (%) — terisi otomatis di keranjang kasir">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={Number(store?.default_tax_percent ?? 0)}
              key={`tax-${store?.default_tax_percent ?? '0'}`}
              disabled={busy || !store}
              onBlur={(e) => {
                const next = Number(e.target.value);
                if (store && next !== Number(store.default_tax_percent)) {
                  void patch({ default_tax_percent: next }, 'Pajak default diperbarui.');
                }
              }}
              className="tabular-nums"
            />
          </Field>

          {/* Low stock threshold */}
          <Field label="Ambang stok rendah — dipakai untuk badge & filter peringatan">
            <Input
              type="number"
              min={0}
              max={100000}
              defaultValue={store?.low_stock_threshold ?? 5}
              key={`threshold-${store?.low_stock_threshold ?? '5'}`}
              disabled={busy || !store}
              onBlur={(e) => {
                const next = Number(e.target.value);
                if (store && next !== store.low_stock_threshold) {
                  void patch({ low_stock_threshold: next }, 'Ambang stok rendah diperbarui.');
                }
              }}
              className="tabular-nums"
            />
          </Field>
        </div>

        {/* Auto print */}
        <div className="flex items-start justify-between gap-4 border-t border-gray-100 pt-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Icon name="printer" className="h-4 w-4 text-brand-600" />
              Cetak struk otomatis
            </p>
            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-gray-500">
              Setelah pembayaran berhasil, dialog cetak struk langsung terbuka — kasir tinggal
              menekan cetak.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={store?.auto_print_receipt ?? false}
            aria-label="Cetak struk otomatis"
            disabled={busy || !store}
            onClick={() =>
              patch(
                { auto_print_receipt: !(store?.auto_print_receipt ?? false) },
                `Cetak otomatis ${store?.auto_print_receipt ? 'dinonaktifkan' : 'diaktifkan'}.`,
              )
            }
            className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 ${
              store?.auto_print_receipt ? 'bg-brand-600' : 'bg-gray-300'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                store?.auto_print_receipt ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {msg && <Notice kind={msg.kind} text={msg.text} />}
      </CardContent>
    </Card>
  );
}

/** Owner-only: create and manage cashiers. */
function CashiersSection() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await apiClient<{ data: PublicUser[] }>('/api/users');
      setUsers(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      await apiClient('/api/users', { method: 'POST', body: form });
      setForm({ name: '', email: '', password: '', role: 'cashier' });
      setMsg({ kind: 'success', text: 'Akun berhasil dibuat.' });
      void load();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiClientError ? err.message : 'Gagal membuat akun' });
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    if (!window.confirm('Nonaktifkan akun ini?')) return;
    try {
      await apiClient(`/api/users/${id}`, { method: 'DELETE' });
      void load();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiClientError ? err.message : 'Gagal menonaktifkan' });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staf &amp; Kasir</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <form onSubmit={create} className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Icon name="plus" className="h-4 w-4 text-brand-600" />
              Tambah akun baru
            </p>
            <Field label="Nama lengkap">
              <Input
                placeholder="mis. Budi Santoso"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                placeholder="nama@toko.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Kata sandi sementara">
              <Input
                type="password"
                placeholder="min. 8 karakter"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Peran">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="cashier">Kasir</option>
                <option value="owner">Owner</option>
              </Select>
            </Field>
            {msg && <Notice kind={msg.kind} text={msg.text} />}
            <Button type="submit" disabled={saving}>
              {saving ? 'Membuat…' : 'Buat Akun'}
            </Button>
          </form>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Daftar staf</p>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full min-w-[380px] text-sm">
                <thead>
                  <tr className="bg-gray-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <th className="py-2 pl-3">Nama</th>
                    <th>Peran</th>
                    <th className="pr-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className={u.is_active ? '' : 'opacity-40'}>
                      <td className="py-2 pl-3">
                        <div className="font-medium text-gray-800">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td>
                        <Badge variant={u.role === 'owner' ? 'brand' : 'neutral'}>
                          {u.role === 'owner' ? 'Owner' : 'Kasir'}
                        </Badge>
                      </td>
                      <td className="pr-2 text-right">
                        {u.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => deactivate(u.id)}
                          >
                            Nonaktifkan
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users[0] && (
              <p className="mt-2 text-xs text-gray-400">
                Akun pertama dibuat {formatDateTime(users[0].created_at)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
