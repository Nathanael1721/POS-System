'use client';

import { useEffect } from 'react';
import type { Receipt } from '@simplepos/shared';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  card: 'Kartu',
};

export function ReceiptModal({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Struk pembayaran"
      onClick={onClose}
    >
      <div
        className="printable-receipt w-full max-w-sm rounded-xl bg-white p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Store header */}
        <div className="border-b border-dashed border-gray-300 pb-3 text-center">
          <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">
            {receipt.store_name}
          </h2>
          <p className="mt-1 font-mono text-xs text-gray-500">{receipt.order_number}</p>
          <p className="text-xs text-gray-500">{formatDateTime(receipt.created_at)}</p>
          {receipt.cashier_name && <p className="text-xs text-gray-500">Kasir: {receipt.cashier_name}</p>}
        </div>

        {/* Items */}
        <ul className="my-3 space-y-1.5 py-1 text-sm">
          {receipt.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="min-w-0 flex-1 text-gray-700">
                <span className="font-medium">{it.product_name}</span>
                <span className="text-gray-500"> × {it.quantity}</span>
              </span>
              <span className="font-medium tabular-nums text-gray-800">
                {formatCurrency(it.subtotal)}
              </span>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <div className="space-y-1 border-t border-dashed border-gray-300 py-3 text-sm">
          <Line label="Subtotal" value={formatCurrency(receipt.subtotal)} />
          <Line
            label={`Diskon (${receipt.discount_percent}%)`}
            value={`− ${formatCurrency(receipt.discount_amount)}`}
          />
          <Line label={`Pajak (${receipt.tax_percent}%)`} value={formatCurrency(receipt.tax_amount)} />
          <div className="flex items-baseline justify-between border-t border-gray-200 pt-2">
            <span className="font-semibold text-gray-800">Total</span>
            <span className="text-base font-bold tabular-nums text-gray-900">
              {formatCurrency(receipt.total)}
            </span>
          </div>
          <Line
            label={`Dibayar (${METHOD_LABEL[receipt.payment_method] ?? receipt.payment_method})`}
            value={formatCurrency(receipt.amount_paid)}
          />
          <Line
            label="Kembalian"
            value={formatCurrency(receipt.change_given)}
            valueClassName="font-semibold text-emerald-700"
          />
          {receipt.reference && <Line label="Ref" value={receipt.reference} />}
        </div>

        <p className="border-t border-dashed border-gray-300 pb-1 pt-3 text-center text-xs text-gray-500">
          Terima kasih atas kunjungan Anda
        </p>

        <div className="no-print mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
            <Icon name="printer" className="h-4 w-4" />
            Cetak Nota
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Transaksi Baru
          </Button>
        </div>
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  valueClassName = 'tabular-nums text-gray-700',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
