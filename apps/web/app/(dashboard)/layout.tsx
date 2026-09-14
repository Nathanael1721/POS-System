'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicUser, Store } from '@simplepos/shared';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Icon } from '@/components/ui/icon';
import { apiClient } from '@/lib/api-client';
import { tokenStore } from '@/lib/auth';

/**
 * Authenticated dashboard shell. Loads the current user via /api/auth/me and
 * redirects to login if no valid session can be established.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [checked, setChecked] = useState(false);
  // Mobile navigation drawer (sidebar is static on lg+).
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!tokenStore.getRefresh()) {
        router.replace('/login');
        return;
      }
      try {
        const { user: me } = await apiClient<{ user: PublicUser }>('/api/auth/me');
        // Store config drives the shift menu visibility (optional best-effort).
        const storeInfo = await apiClient<Store>('/api/store').catch(() => null);
        if (active) {
          setUser(me);
          setStore(storeInfo);
          setChecked(true);
        }
      } catch {
        tokenStore.clear();
        router.replace('/login');
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (!checked || !user) {
    return (
      <div className="grid h-screen place-items-center bg-gray-100">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="grid h-10 w-10 animate-pulse place-items-center rounded-xl bg-brand-600/90 text-white">
            <Icon name="store" className="h-5 w-5" />
          </div>
          <p className="text-sm">Memuat…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        role={user.role}
        shiftEnabled={store?.shift_enabled ?? false}
        storeName={store?.name}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header user={user} onMenu={() => setNavOpen(true)} />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
