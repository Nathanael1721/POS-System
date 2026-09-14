'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CreateOrderResult, PaymentMethod, Product, Receipt } from '@simplepos/shared';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { IconInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useCart } from '@/hooks/useCart';
import { useProducts } from '@/hooks/useProducts';
import { useShift } from '@/hooks/useShift';
import { useStore } from '@/hooks/useStore';
import type { HeldCart } from '@/types';
import { OpenShiftCard, ShiftBar, CloseShiftModal, CashMovementModal } from '@/components/pos/ShiftControls';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { cn, formatCurrency } from '@/lib/utils';

const HELD_KEY = 'simplepos.held_carts';

function loadHeldCarts(): HeldCart[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HELD_KEY);
    const parsed = raw ? (JSON.parse(raw) as HeldCart[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** A barcode scanner types digits fast and ends with Enter; free text is search. */
function looksLikeBarcode(value: string): boolean {
  return /^\d{4,}$/.test(value);
}

export default function CashierPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  // Debounce the product search so typing does not hit the API per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { products, categories, loading, refetch } = useProducts({ search, categoryId });

  const { store, loading: storeLoading } = useStore();
  const shiftEnabled = store?.shift_enabled ?? false;
  const shift = useShift();
  const [closing, setClosing] = useState(false);
  const [cashMove, setCashMove] = useState<'in' | 'out' | null>(null);
  const cart = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Scan feedback is transient: auto-dismiss so the chip never lingers on screen.
  useEffect(() => {
    if (!scanMsg) return;
    const t = setTimeout(() => setScanMsg(null), 4000);
    return () => clearTimeout(t);
  }, [scanMsg]);
  const visibleProducts = useMemo(() => products, [products]);

  // Held (parked) carts survive page reloads via localStorage.
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  useEffect(() => {
    setHeldCarts(loadHeldCarts());
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(HELD_KEY, JSON.stringify(heldCarts));
    } catch {
      /* storage full/unavailable — holding still works in-memory */
    }
  }, [heldCarts]);

  const searchRef = useRef<HTMLInputElement>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);
  // Mobile: cart lives in a bottom sheet instead of the side panel.
  const [cartOpen, setCartOpen] = useState(false);
  // Apply the store's default tax once, when the config first arrives.
  const taxApplied = useRef(false);
  useEffect(() => {
    if (store && !taxApplied.current) {
      taxApplied.current = true;
      const defaultTax = Number(store.default_tax_percent ?? 0);
      if (Number.isFinite(defaultTax) && defaultTax > 0) cart.setTaxPercent(defaultTax);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run-once guard via taxApplied ref; `cart` identity changes every render
  }, [store]);

  function holdCart() {
    if (cart.lines.length === 0) return;
    const label = `Tiket ${heldCarts.length + 1}`;
    setHeldCarts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label,
        heldAt: Date.now(),
        lines: cart.lines,
        discountPercent: cart.discountPercent,
        taxPercent: cart.taxPercent,
      },
    ]);
    cart.clear();
    setAmountPaid('');
  }

  function resumeHeld(id: string) {
    const held = heldCarts.find((h) => h.id === id);
    if (!held) return;
    // If the current cart is in progress, park it first so nothing is lost.
    if (cart.lines.length > 0) holdCart();
    const fresh = loadHeldCarts().find((h) => h.id === id) ?? held;
    // Re-clamp quantities to the latest stock before restoring.
    const productsById = new Map(products.map((p) => [p.id, p]));
    fresh.lines.forEach((l) => {
      const current = productsById.get(l.product.id);
      const stock = current ? current.stock : l.product.stock;
      if (stock <= 0) return; // went out of stock while held — skip (server still guards)
      cart.add({ ...l.product, stock }, Math.min(l.quantity, stock));
    });
    cart.setDiscountPercent(fresh.discountPercent);
    cart.setTaxPercent(fresh.taxPercent);
    setHeldCarts((prev) => prev.filter((h) => h.id !== id));
  }

  /**
   * Scan-to-add: a barcode scanner acts as a keyboard that types the code then
   * presses Enter. Only digit-runs are treated as scans; free text falls back
   * to the live search filter (no error noise).
   */
  async function handleScan(code: string) {
    const value = code.trim();
    if (!value || !looksLikeBarcode(value)) return;
    setScanMsg(null);
    try {
      const product = await apiClient<Product>(`/api/products/barcode/${encodeURIComponent(value)}`);
      if (!product.is_active) {
        setScanMsg({ ok: false, text: `"${product.name}" tidak aktif` });
        return;
      }
      if (product.stock <= 0) {
        setScanMsg({ ok: false, text: `"${product.name}" stok habis` });
        return;
      }
      cart.add(product);
      setScanMsg({ ok: true, text: `${product.name} ditambahkan ke keranjang` });
      setSearchInput('');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setScanMsg({ ok: false, text: `Barcode "${value}" tidak ditemukan` });
      } else {
        setScanMsg({ ok: false, text: 'Gagal mencari barcode' });
      }
    }
  }

  async function handleCheckout() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        items: cart.lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        discount_percent: cart.discountPercent,
        tax_percent: cart.taxPercent,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'cash' ? Number(amountPaid) : cart.total,
        reference: paymentMethod === 'cash' ? null : reference.trim(),
      };
      const result = await apiClient<CreateOrderResult>('/api/orders', { method: 'POST', body: payload });
      setReceipt(result.receipt);
      // Optional store behaviour: open the browser print dialog right away.
      if (store?.auto_print_receipt) setTimeout(() => window.print(), 400);
      cart.clear();
      setAmountPaid('');
      setReference('');
      void refetch();
      void shift.refresh(); // update running shift totals
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Checkout gagal');
    } finally {
      setSubmitting(false);
    }
  }

  // POS keyboard shortcuts (common on hardware terminals):
  // F2 = focus search/scan, F4 = hold cart, F8 = pay.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        holdCart();
      } else if (e.key === 'F8') {
        e.preventDefault();
        payButtonRef.current?.click();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.lines, heldCarts.length]);

  // Wait for store config (shift toggle) before deciding the layout.
  if (storeLoading) {
    return (
      <div className="grid h-full place-items-center">
        <p className="text-sm text-gray-500">Memuat…</p>
      </div>
    );
  }

  // Shift gate applies only when the store enables the shift system.
  if (shiftEnabled) {
    if (shift.loading) {
      return (
        <div className="grid h-full place-items-center">
          <p className="text-sm text-gray-500">Memuat shift…</p>
        </div>
      );
    }
    if (!shift.shift) {
      return <OpenShiftCard onOpen={shift.open} />;
    }
  }

  const posInner = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 pb-24 lg:pb-4">
        <div className="mb-3 flex gap-2">
          <IconInput
            icon={<Icon name="search" className="h-4 w-4" />}
            placeholder="Cari nama / SKU, scan barcode lalu Enter…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleScan(searchInput);
              }
            }}
            ref={searchRef}
            autoFocus
          />
          <div className="hidden shrink-0 items-center gap-1.5 self-center pl-1 text-[10px] text-gray-500 lg:flex">
            <Kbd>F2</Kbd> cari
            <Kbd>F4</Kbd> tahan
            <Kbd>F8</Kbd> bayar
          </div>
        </div>

        {/* Category quick filter chips */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="Filter kategori">
          <CategoryChip active={!categoryId} onClick={() => setCategoryId(undefined)}>
            Semua
          </CategoryChip>
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              active={categoryId === c.id}
              onClick={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
            >
              {c.name}
            </CategoryChip>
          ))}
        </div>

        {scanMsg && (
          <div
            role="status"
            className={
              scanMsg.ok
                ? 'mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10'
                : 'mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/15'
            }
          >
            <Icon name={scanMsg.ok ? 'check-circle' : 'alert-circle'} className="h-4 w-4 shrink-0" />
            {scanMsg.text}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mb-3 flex items-center gap-2.5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-600/10"
          >
            <Icon name="alert-circle" className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-medium underline underline-offset-2"
            >
              Tutup
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ProductGrid
            products={visibleProducts}
            loading={loading}
            lowThreshold={store?.low_stock_threshold ?? 5}
            onSelect={(p) => cart.add(p)}
          />
        </div>
      </section>

      <aside className="hidden w-96 shrink-0 border-l border-gray-200 bg-white shadow-[-4px_0_12px_-8px_rgb(0_0_0/0.06)] lg:flex lg:flex-col">
        <CartPanel
          cart={cart}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          reference={reference}
          setReference={setReference}
          onCheckout={handleCheckout}
          submitting={submitting}
          onHold={holdCart}
          heldCarts={heldCarts}
          onResumeHeld={resumeHeld}
          payButtonRef={payButtonRef}
        />
      </aside>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );

  // Mobile cart: sticky total bar + bottom sheet (desktop uses the side panel).
  const mobileCart = (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-gray-200 bg-white/95 px-4 py-2.5 shadow-[0_-4px_12px_-4px_rgb(0_0_0/0.08)] backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-500">{cart.itemCount} item di keranjang</p>
          <p className="truncate text-base font-bold tabular-nums text-gray-900">
            {formatCurrency(cart.total)}
          </p>
        </div>
        <Button
          variant={cart.lines.length > 0 ? 'primary' : 'secondary'}
          onClick={() => setCartOpen(true)}
          disabled={cart.lines.length === 0}
        >
          <Icon name="cart" className="h-4 w-4" />
          Keranjang
        </Button>
      </div>

      {cartOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Keranjang"
          onClick={() => setCartOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-[2px]" />
          <div
            className="relative flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <span className="mx-auto h-1.5 w-10 rounded-full bg-gray-200" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Tutup keranjang"
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <CartPanel
                cart={cart}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                amountPaid={amountPaid}
                setAmountPaid={setAmountPaid}
                reference={reference}
                setReference={setReference}
                onCheckout={handleCheckout}
                submitting={submitting}
                onHold={holdCart}
                heldCarts={heldCarts}
                onResumeHeld={resumeHeld}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col">
      {shiftEnabled && shift.shift && (
        <div className="px-4 pt-3">
          <ShiftBar
            shift={shift.shift}
            summary={shift.summary}
            onClose={() => setClosing(true)}
            onCashIn={() => setCashMove('in')}
            onCashOut={() => setCashMove('out')}
          />
        </div>
      )}

      {posInner}
      {mobileCart}

      {closing && shift.shift && (
        <CloseShiftModal
          summary={shift.summary}
          onConfirm={shift.close}
          onCancel={() => {
            setClosing(false);
            cart.clear();
          }}
        />
      )}

      {cashMove && (
        <CashMovementModal
          type={cashMove}
          onDone={() => {
            setCashMove(null);
            void shift.refresh();
          }}
          onCancel={() => setCashMove(null)}
        />
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-brand-600 text-white shadow-sm'
          : 'border border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-700',
      )}
    >
      {children}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-gray-500 shadow-sm">
      {children}
    </kbd>
  );
}
