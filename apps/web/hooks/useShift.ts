'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Shift, ShiftSummary, ShiftWithSummary } from '@simplepos/shared';
import { apiClient } from '@/lib/api-client';

interface UseShift {
  loading: boolean;
  shift: Shift | null;
  summary: ShiftSummary | null;
  refresh: () => Promise<void>;
  open: (openingCash: number) => Promise<void>;
  close: (countedCash: number, notes: string) => Promise<ShiftWithSummary>;
}

/**
 * Manages the caller's current cash-drawer shift: load the open shift (with a
 * live sales summary), open a new one, or close & reconcile the current one.
 */
export function useShift(): UseShift {
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient<ShiftWithSummary | { shift: null }>('/api/shifts/current');
      if (res.shift) {
        setShift(res.shift);
        setSummary((res as ShiftWithSummary).summary);
      } else {
        setShift(null);
        setSummary(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const open = useCallback(
    async (openingCash: number) => {
      await apiClient('/api/shifts/open', { method: 'POST', body: { opening_cash: openingCash } });
      await refresh();
    },
    [refresh],
  );

  const close = useCallback(
    async (countedCash: number, notes: string) => {
      const result = await apiClient<ShiftWithSummary>('/api/shifts/close', {
        method: 'POST',
        body: { counted_cash: countedCash, notes: notes || null },
      });
      await refresh();
      return result;
    },
    [refresh],
  );

  return { loading, shift, summary, refresh, open, close };
}
