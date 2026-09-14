'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tokenStore } from '@/lib/auth';
import { Icon } from '@/components/ui/icon';

/** Entry point: owners land on the dashboard, cashiers on the POS terminal. */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const hasSession = tokenStore.getRefresh();
    const role = tokenStore.getUser()?.role;
    if (!hasSession) router.replace('/login');
    else router.replace(role === 'owner' ? '/dashboard' : '/cashier');
  }, [router]);

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
