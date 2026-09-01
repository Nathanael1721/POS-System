'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReportSummary, Shift, TopProduct, Paginated, Product } from '@simplepos/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon, type IconName } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { useProducts } from '@/hooks/useProducts';
import { useStore } from '@/hooks/useStore';
import { formatCurrency, formatDateTime } from '@/lib/utils';

/** Owner overview: today's sales, low stock, open shifts, top products. */
export default function DashboardPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const { store } = useStore();
  const threshold = store?.low_stock_threshold ?? 5;
  const { products } = useProducts({ limit: 100 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, shifts] = await Promise.all([
        apiClient<ReportSummary>('/api/reports/summary', { query: { period: 'daily' } }),
        apiClient<TopProduct[]>('/api/reports/top-products', { query: { period: 'daily', limit: 3 } }),
        apiClient<Paginated<Shift>>('/api/shifts', { query: { status: 'open', limit: 5 } }),
      ]);
      setSummary(s);
      setTop(t);
      setOpenShifts(shifts.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lowStock = products
    .filter((p) => p.is_active && p.stock <= threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  return (
    <div className="h-full overflow-y-auto p-4 pb-8">
      <div className="mb-4">
        <h1 className="text-lg font-bold tracking-tight text-gray-900">Beranda</h1>
        <p className="text-xs text-gray-400">Ringkasan toko Anda hari ini</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton className="mb-2 h-3.5 w-24" />
                <Skeleton className="h-8 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat icon="wallet" label="Penjualan hari ini" value={formatCurrency(summary?.total_revenue ?? 0)} />
          <Stat icon="receipt" label="Pesanan hari ini" value={String(summary?.total_orders ?? 0)} />
          <Stat icon="chart" label="Rata-rata per pesanan" value={formatCurrency(summary?.avg_order_value ?? 0)} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top products today */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Produk terlaris hari ini</CardTitle>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Belum ada penjualan hari ini.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {top.map((p, i) => (
                  <li key={p.product_name} className="flex items-center gap-3 py-2.5">
                    <span
                      className={
                        i === 0
                          ? 'grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700'
                          : 'grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-400'
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                      {p.product_name}
                    </span>
                    <span className="text-xs tabular-nums text-gray-500">{p.quantity_sold} terjual</span>
                    <span className="w-24 text-right text-sm font-semibold tabular-nums text-gray-800">
                      {formatCurrency(p.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Open shifts */}
        <Card>
          <CardHeader>
            <CardTitle>Shift berjalan</CardTitle>
          </CardHeader>
          <CardContent>
            {openShifts.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">Tidak ada shift terbuka.</p>
            ) : (
              <ul className="space-y-2.5">
                {openShifts.map((s) => (
                  <li key={s.id} className="rounded-lg bg-gray-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="brand" dot>
                        Terbuka
                      </Badge>
                      <span className="text-[11px] text-gray-400">{formatDateTime(s.opened_at)}</span>
                    </div>
                    <div className="mt-1.5 flex justify-between text-sm">
                      <span className="text-gray-500">Penjualan</span>
                      <span className="font-semibold tabular-nums text-gray-800">
                        {formatCurrency(s.total_sales)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Order</span>
                      <span className="tabular-nums text-gray-800">{s.order_count}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Low stock watchlist */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Stok rendah</CardTitle>
            <Badge variant={lowStock.length > 0 ? 'warning' : 'success'}>
              ambang ≤ {threshold}
            </Badge>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Semua produk stoknya sehat. 👍
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {lowStock.map((p) => (
                  <LowStockRow key={p.id} product={p} threshold={threshold} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LowStockRow({ product, threshold }: { product: Product; threshold: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-300">
        <Icon name="package" className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{product.name}</p>
        <p className="text-xs text-gray-400">{formatCurrency(product.price)}</p>
      </div>
      {product.stock <= 0 ? (
        <Badge variant="danger">Habis</Badge>
      ) : (
        <Badge variant="warning">Sisa {product.stock}</Badge>
      )}
      <span className="sr-only">ambang {threshold}</span>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-400">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Icon name={icon} className="h-3.5 w-3.5" />
          </span>
          {label}
        </div>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
