'use client';

import { useState, type RefObject } from 'react';import type { PaymentMethod } from '@simplepos/shared';
import type { UseCart } from '@/hooks/useCart';
import type { HeldCart } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon, type IconName } from '@/components/ui/icon';
import { NumPad } from '@/components/pos/NumPad';
import { formatCurrency, formatThousands, digitsOnly, quickCashSuggestions } from '@/lib/utils';

interface CartPanelProps {
  cart: UseCart;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  amountPaid: string;
  setAmountPaid: (v: string) => void;
  reference: string;
  setReference: (v: string) => void;
  onCheckout: () => void;
  submitting: boolean;
  /** Hold/park the current cart (resume later). */
  onHold: () => void;
  heldCarts: HeldCart[];
  onResumeHeld: (id: string) => void;
  /** Ref to the pay button so the F8 shortcut can trigger it. */
  payButtonRef?: RefObject<HTMLButtonElement>;
}

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string; icon: IconName }> = [
  { value: 'cash', label: 'Tunai', icon: 'banknote' },
  { value: 'qris', label: 'QRIS', icon: 'qris' },
  { value: 'card', label: 'Kartu', icon: 'credit-card' },
];

function heldTime(at: number): string {
  return new Date(at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function CartPanel({
  cart,
  paymentMethod,
  setPaymentMethod,
  amountPaid,
  setAmountPaid,
  reference,
  setReference,
  onCheckout,
  submitting,
  onHold,
  heldCarts,
  onResumeHeld,
  payButtonRef,
}: CartPanelProps) {
  const [numpadOpen, setNumpadOpen] = useState(false);
  const change = paymentMethod === 'cash' ? Math.max(0, Number(amountPaid || 0) - cart.total) : 0;
  // For cash, the cashier must enter at least the total. For non-cash the page
  // submits amount_paid = total automatically, so only a reference is required.
  const canCheckout =
    cart.lines.length > 0 &&
    !submitting &&
    cart.total > 0 &&
    (paymentMethod === 'cash' ? Number(amountPaid) >= cart.total : reference.trim().length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Icon name="cart" className="h-4 w-4 text-brand-600" />
        <span className="text-sm font-semibold text-gray-800">Keranjang</span>
        <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/15">
          {cart.itemCount} item
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={onHold}
          disabled={cart.lines.length === 0}
          title="Tahan keranjang ini dan layani pelanggan lain (F4)"
        >
          <Icon name="pause" className="h-3.5 w-3.5" />
          Tahan
        </Button>
      </div>

      {/* Held (parked) tickets ready to resume */}
      {heldCarts.length > 0 && (
        <div className="border-b border-gray-100 bg-amber-50/60 px-4 py-2">
          <p className="mb-1.5 text-[11px] font-medium text-amber-700">
            Tiket ditahan — klik untuk lanjutkan
          </p>
          <div className="flex flex-wrap gap-1.5">
            {heldCarts.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => onResumeHeld(h.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50"
                title="Lanjutkan tiket ini"
              >
                <Icon name="play" className="h-3 w-3" />
                {h.label} · {h.lines.reduce((n, l) => n + l.quantity, 0)} item · {heldTime(h.heldAt)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lines */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {cart.lines.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <div className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-gray-300">
                <Icon name="shopping-bag" className="h-5 w-5" />
              </div>
              <p className="text-sm text-gray-400">Keranjang masih kosong</p>
              <p className="mt-0.5 text-xs text-gray-300">Klik produk untuk menambahkan</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {cart.lines.map((line) => (
              <li key={line.product.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{line.product.name}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-gray-400">
                    {formatCurrency(line.product.price)} / item
                  </p>
                </div>

                {/* Quantity stepper */}
                <div className="flex h-8 items-center rounded-lg border border-gray-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => cart.setQty(line.product.id, line.quantity - 1)}
                    aria-label={`Kurangi ${line.product.name}`}
                    className="grid h-full w-7 place-items-center text-gray-400 transition-colors hover:text-brand-600 disabled:opacity-30"
                    disabled={line.quantity <= 1}
                  >
                    <Icon name="minus" className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={line.product.stock}
                    value={line.quantity}
                    onChange={(e) => cart.setQty(line.product.id, Number(e.target.value))}
                    className="h-full w-10 border-0 bg-transparent p-0 text-center text-sm font-medium tabular-nums text-gray-800 focus:outline-none focus:ring-0"
                    aria-label={`Jumlah ${line.product.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => cart.setQty(line.product.id, line.quantity + 1)}
                    aria-label={`Tambah ${line.product.name}`}
                    className="grid h-full w-7 place-items-center text-gray-400 transition-colors hover:text-brand-600 disabled:opacity-30"
                    disabled={line.quantity >= line.product.stock}
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" />
                  </button>
                </div>

                <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-800">
                  {formatCurrency(Number(line.product.price) * line.quantity)}
                </span>
                <button
                  onClick={() => cart.remove(line.product.id)}
                  className="grid h-6 w-6 place-items-center rounded-md text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label={`Hapus ${line.product.name}`}
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Summary & payment */}
      <div className="space-y-3 border-t border-gray-100 bg-white px-4 py-3.5">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-gray-500">
            Diskon %
            <Input
              type="number"
              min={0}
              max={100}
              value={cart.discountPercent}
              onChange={(e) => cart.setDiscountPercent(Number(e.target.value))}
              className="mt-1 h-9"
            />
          </label>
          <label className="text-xs font-medium text-gray-500">
            Pajak %
            <Input
              type="number"
              min={0}
              max={100}
              value={cart.taxPercent}
              onChange={(e) => cart.setTaxPercent(Number(e.target.value))}
              className="mt-1 h-9"
            />
          </label>
        </div>

        <div className="space-y-1 rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
          <Row label="Subtotal" value={formatCurrency(cart.subtotal)} />
          <Row label="Diskon" value={`− ${formatCurrency(cart.discountAmount)}`} muted />
          <Row label="Pajak" value={formatCurrency(cart.taxAmount)} muted />
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold tabular-nums text-gray-900">
              {formatCurrency(cart.total)}
            </span>
          </div>
        </div>

        {/* Payment method: segmented control */}
        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Metode pembayaran">
          {PAYMENT_OPTIONS.map((opt) => {
            const active = paymentMethod === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setPaymentMethod(opt.value);
                  setNumpadOpen(false);
                }}
                className={
                  active
                    ? 'flex flex-col items-center gap-1 rounded-lg border border-brand-600 bg-brand-600 px-2 py-2 text-xs font-semibold text-white shadow-sm transition-all'
                    : 'flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-medium text-gray-500 transition-all hover:border-gray-300 hover:text-gray-700'
                }
              >
                <Icon name={opt.icon} className="h-[18px] w-[18px]" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {paymentMethod === 'cash' ? (
          <>
            {/* Quick-cash shortcuts: exact amount + nearest round-up denominations */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAmountPaid(String(Math.round(cart.total)))}
                className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Uang Pas
              </button>
              {quickCashSuggestions(cart.total).map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setAmountPaid(String(amount))}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium tabular-nums text-gray-600 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  {formatThousands(String(amount))}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                  Rp
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatThousands(amountPaid)}
                  onChange={(e) => setAmountPaid(digitsOnly(e.target.value))}
                  className="pl-10 font-semibold tabular-nums"
                  aria-label="Jumlah uang dibayar"
                />
              </label>
              <Button
                type="button"
                variant={numpadOpen ? 'primary' : 'secondary'}
                size="icon"
                className="h-10 w-10"
                onClick={() => setNumpadOpen((v) => !v)}
                title={numpadOpen ? 'Tutup keypad angka' : 'Buka keypad angka'}
                aria-pressed={numpadOpen}
              >
                <Icon name="keyboard" className="h-4 w-4" />
              </Button>
            </div>
            {numpadOpen && <NumPad value={amountPaid} onChange={(v) => setAmountPaid(v)} />}
            <div
              className={
                change > 0
                  ? 'flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm ring-1 ring-inset ring-emerald-600/10'
                  : 'flex items-center justify-between px-3 py-1 text-sm'
              }
            >
              <span className={change > 0 ? 'font-medium text-emerald-700' : 'text-gray-500'}>
                Kembalian
              </span>
              <span
                className={
                  change > 0
                    ? 'font-bold tabular-nums text-emerald-700'
                    : 'font-medium tabular-nums text-gray-600'
                }
              >
                {formatCurrency(change)}
              </span>
            </div>
          </>
        ) : (
          <Input
            placeholder="Nomor referensi pembayaran"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        )}

        <Button ref={payButtonRef} className="w-full" size="lg" disabled={!canCheckout} onClick={onCheckout}>
          {submitting ? (
            'Memproses…'
          ) : (
            <>
              Bayar {formatCurrency(cart.total)}
              <Icon name="chevron-right" className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={muted ? 'tabular-nums text-gray-500' : 'tabular-nums text-gray-700'}>
        {value}
      </span>
    </div>
  );
}
