'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Product } from '@simplepos/shared';
import type { CartLine } from '@/types';

export interface UseCart {
  lines: CartLine[];
  add: (product: Product, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  discountPercent: number;
  setDiscountPercent: (n: number) => void;
  taxPercent: number;
  setTaxPercent: (n: number) => void;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  itemCount: number;
}

/**
 * Client-side cart state for the POS terminal. Totals mirror the backend's
 * money rules (discount then tax) so the cashier sees an accurate preview.
 */
export function useCart(): UseCart {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);

  const add = useCallback((product: Product, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        const capped = Math.min(existing.quantity + qty, product.stock);
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: capped } : l));
      }
      return [...prev, { product, quantity: Math.min(qty, product.stock) }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.product.id !== productId) return l;
        // Keep the line alive while the cashier retypes the field: empty or
        // invalid input clamps to 1 instead of silently deleting the item.
        const safe = Number.isFinite(qty) ? Math.floor(qty) : 1;
        return { ...l, quantity: Math.max(1, Math.min(safe, l.product.stock)) };
      }),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setDiscountPercent(0);
    setTaxPercent(0);
  }, []);

  const { subtotal, discountAmount, taxAmount, total } = useMemo(() => {
    // Guard against transient NaN while typing (e.g. "1-", "") so the preview
    // never breaks or enables checkout with garbage numbers.
    const safeDisc = Number.isFinite(discountPercent) ? Math.min(Math.max(discountPercent, 0), 100) : 0;
    const safeTax = Number.isFinite(taxPercent) ? Math.min(Math.max(taxPercent, 0), 100) : 0;
    const sub = lines.reduce((sum, l) => sum + Number(l.product.price) * l.quantity, 0);
    const disc = Math.round((sub * safeDisc) / 100);
    const taxable = sub - disc;
    const tax = Math.round((taxable * safeTax) / 100);
    return { subtotal: sub, discountAmount: disc, taxAmount: tax, total: taxable + tax };
  }, [lines, discountPercent, taxPercent]);

  const itemCount = useMemo(() => lines.reduce((n, l) => n + l.quantity, 0), [lines]);

  return {
    lines,
    add,
    setQty,
    remove,
    clear,
    discountPercent,
    setDiscountPercent,
    taxPercent,
    setTaxPercent,
    subtotal,
    discountAmount,
    taxAmount,
    total,
    itemCount,
  };
}
