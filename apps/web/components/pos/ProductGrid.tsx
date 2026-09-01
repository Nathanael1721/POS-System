'use client';

import type { Product } from '@simplepos/shared';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { GridSkeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency, resolveImageUrl } from '@/lib/utils';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onSelect: (product: Product) => void;
  /** Stock level at/below which the badge turns amber (store-configurable). */
  lowThreshold?: number;
}

/** Stock tier shown as a colored badge on each product card. */
function stockBadge(stock: number, lowThreshold: number) {
  if (stock <= 0) return <Badge variant="danger">Habis</Badge>;
  if (stock <= lowThreshold) return <Badge variant="warning">Sisa {stock}</Badge>;
  return <Badge variant="success">Stok {stock}</Badge>;
}

export function ProductGrid({ products, loading, onSelect, lowThreshold = 5 }: ProductGridProps) {
  if (loading) return <GridSkeleton count={10} />;

  if (products.length === 0) {
    return (
      <EmptyState
        icon="package"
        title="Produk tidak ditemukan"
        description="Coba kata kunci lain, ubah filter kategori, atau tambahkan produk baru di menu Produk."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => {
        const out = product.stock <= 0;
        const img = resolveImageUrl(product.image_url);
        return (
          <button
            key={product.id}
            type="button"
            tabIndex={out ? -1 : 0}
            aria-disabled={out}
            aria-label={`${product.name}, ${formatCurrency(product.price)}${out ? ' (stok habis)' : ''}`}
            onClick={() => !out && onSelect(product)}
            onKeyDown={(e) => {
              if (!out && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(product);
              }
            }}
            className={cn(
              'group flex flex-col rounded-xl border border-gray-200/80 bg-white p-3 text-left shadow-card transition-all duration-100',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
              out
                ? 'cursor-not-allowed opacity-55'
                : 'cursor-pointer hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover active:translate-y-0 active:scale-[0.98]',
            )}
          >
            <div className="relative mb-3 grid h-24 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Icon name="package" className="h-8 w-8 text-gray-300" />
              )}
              {out && (
                <span className="absolute inset-0 grid place-items-center bg-white/60 text-xs font-semibold text-red-600">
                  Stok Habis
                </span>
              )}
            </div>
            <div className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-gray-800">
              {product.name}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold tabular-nums text-gray-900">
                {formatCurrency(product.price)}
              </span>
              {stockBadge(product.stock, lowThreshold)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
