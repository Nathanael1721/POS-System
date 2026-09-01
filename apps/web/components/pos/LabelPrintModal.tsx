'use client';

import { useState } from 'react';
import type { Product } from '@simplepos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { Barcode } from '@/components/pos/Barcode';
import { formatCurrency } from '@/lib/utils';

/**
 * Print price + barcode labels for a product. The cashier chooses how many
 * copies; labels are laid out in a grid and printed via the browser (only the
 * label sheet is printed, courtesy of the .printable-label print CSS).
 */
export function LabelPrintModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [copies, setCopies] = useState(12);
  const code = product.barcode ?? product.sku ?? '';
  const labels = Array.from({ length: Math.max(1, Math.min(copies, 60)) });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-800">
            Cetak Label — <span className="text-gray-500">{product.name}</span>
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Jumlah</label>
            <Input
              type="number"
              min={1}
              max={60}
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="h-8 w-20"
            />
            <Button size="sm" onClick={() => window.print()} disabled={!code}>
              <Icon name="printer" className="h-3.5 w-3.5" />
              Cetak
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>

        {!code ? (
          <div className="p-6 text-sm text-gray-500">
            Produk ini belum punya barcode atau SKU. Tambahkan barcode dulu di form produk.
          </div>
        ) : (
          <div className="printable-label overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-2">
              {labels.map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center rounded border border-dashed border-gray-300 p-2 text-center"
                >
                  <div className="truncate text-xs font-medium text-gray-800" style={{ maxWidth: '100%' }}>
                    {product.name}
                  </div>
                  <div className="text-sm font-bold">{formatCurrency(product.price)}</div>
                  <Barcode value={code} height={36} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
