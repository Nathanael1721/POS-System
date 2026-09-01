'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { PublicUser } from '@simplepos/shared';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { apiClient } from '@/lib/api-client';
import { tokenStore } from '@/lib/auth';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Beranda',
  cashier: 'Kasir',
  orders: 'Pesanan',
  shift: 'Shift',
  products: 'Produk',
  reports: 'Laporan',
  audit: 'Audit Log',
  settings: 'Pengaturan',
};

/** Top bar: mobile menu button + breadcrumb on the left, user identity + logout on the right. */
export function Header({ user, onMenu }: { user: PublicUser; onMenu?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = pathname.split('/').filter(Boolean)[0];
  const pageTitle = current ? (PAGE_TITLES[current] ?? current) : null;

  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleLogout() {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
    } catch {
      /* logout best-effort */
    } finally {
      tokenStore.clear();
      router.replace('/login');
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Buka menu"
          className="mr-1 grid h-9 w-9 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400">
          <Link href="/cashier" className="transition-colors hover:text-gray-600">
            Beranda
          </Link>
          {pageTitle && (
            <>
              <Icon name="chevron-right" className="h-3 w-3" />
              <span className="font-medium text-gray-700">{pageTitle}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {initials}
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-xs font-semibold text-gray-800">{user.name}</div>
            <div className="text-[10px] capitalize text-gray-400">{user.role}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} title="Keluar dari akun">
          <Icon name="logout" className="h-4 w-4" />
          Keluar
        </Button>
      </div>
    </header>
  );
}
