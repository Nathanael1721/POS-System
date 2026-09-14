'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@simplepos/shared';
import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Beranda', icon: 'chart', roles: ['owner'] },
  { href: '/cashier', label: 'Kasir', icon: 'cart', roles: ['owner', 'cashier'] },
  { href: '/orders', label: 'Pesanan', icon: 'receipt', roles: ['owner', 'cashier'] },
  { href: '/shift', label: 'Shift', icon: 'clock', roles: ['owner', 'cashier'] },
  { href: '/products', label: 'Produk', icon: 'package', roles: ['owner'] },
  { href: '/reports', label: 'Laporan', icon: 'chart', roles: ['owner'] },
  { href: '/audit', label: 'Audit', icon: 'info', roles: ['owner'] },
  { href: '/settings', label: 'Pengaturan', icon: 'settings', roles: ['owner', 'cashier'] },
];

export function Sidebar({
  role,
  shiftEnabled = false,
  storeName,
  open,
  onClose,
}: {
  role: Role;
  shiftEnabled?: boolean;
  storeName?: string | null;
  /** Mobile drawer state (ignored on lg+, where the sidebar is static). */
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = NAV.filter(
    (item) => item.roles.includes(role) && (item.href !== '/shift' || shiftEnabled),
  );

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-gray-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-out',
          'lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navigasi samping"
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Icon name="store" className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight text-gray-900">Simple-POS</div>
            <div className="text-[11px] font-medium text-gray-500">Sistem Kasir Ritel</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2" aria-label="Menu utama">
          <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Menu
          </p>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn('h-[18px] w-[18px]', active ? 'text-brand-600' : 'text-gray-500')}
                />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </Link>
            );
          })}
        </nav>

        {/* Store context */}
        <div className="mx-3 mb-3 rounded-lg bg-gray-50 px-3 py-2.5">
          <div className="flex items-center gap-2 truncate text-xs font-medium text-gray-500">
            <Icon name="store" className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <span className="truncate">{storeName ?? 'Toko Anda'}</span>
          </div>
          <div className="mt-1.5 text-[10px] text-gray-500">Simple-POS v1.5.1</div>
        </div>
      </aside>
    </>
  );
}
