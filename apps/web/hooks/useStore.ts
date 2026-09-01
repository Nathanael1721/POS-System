'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Store } from '@simplepos/shared';
import { apiClient } from '@/lib/api-client';

interface UseStore {
  store: Store | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/** Load the current user's store (for settings like the shift toggle). */
export function useStore(): UseStore {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await apiClient<Store>('/api/store');
      setStore(s);
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { store, loading, refresh };
}
