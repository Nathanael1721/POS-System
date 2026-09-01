'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthTokens } from '@simplepos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { tokenStore } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@simplepos.test');
  const [password, setPassword] = useState('Owner123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await apiClient<AuthTokens>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        anonymous: true,
      });
      tokenStore.setSession(tokens);
      router.replace('/cashier');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.status === 429 ? 'Terlalu banyak percobaan. Coba lagi nanti.' : err.message);
      } else {
        setError('Tidak dapat masuk. Periksa koneksi Anda.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-gray-100 p-4">
      {/* Soft decorative background */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand-100/70 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-card-hover">
            <Icon name="store" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Simple-POS</h1>
          <p className="mt-1 text-sm text-gray-500">Masuk untuk mulai berjualan</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-card"
        >
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/10"
            >
              <Icon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Tutup pesan"
                className="text-red-400 transition-colors hover:text-red-600"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-gray-600">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="nama@toko.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-gray-600">
              Kata Sandi
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              'Memeriksa…'
            ) : (
              <>
                Masuk
                <Icon name="chevron-right" className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-[11px] leading-relaxed text-gray-400">
            Akun demo sudah terisi — tekan <span className="font-medium text-gray-500">Masuk</span>{' '}
            untuk mencoba
          </p>
        </form>
      </div>
    </div>
  );
}
