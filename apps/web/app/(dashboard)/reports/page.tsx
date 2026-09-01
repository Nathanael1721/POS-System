'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReportSummary, ReportTrendPoint, TopProduct } from '@simplepos/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { apiClient, apiDownload } from '@/lib/api-client';
import { formatCurrency, cn } from '@/lib/utils';
import {
  toISODate,
  windowOf,
  normalizeAnchor,
  stepAnchor,
  windowLabel,
  rangeLabel,
  trendBucketLabel,
  type ReportWindowPeriod,
} from '@/lib/report-window';

type Period = ReportWindowPeriod;

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
];

export default function ReportsPage() {
  const today = useMemo(() => toISODate(new Date()), []);
  const [period, setPeriod] = useState<Period>('daily');
  const [anchor, setAnchor] = useState(today);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [trend, setTrend] = useState<ReportTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const isCurrent = useMemo(
    () => windowOf(period, anchor).end.getTime() > Date.now(),
    [period, anchor],
  );
  const canGoNext = !isCurrent;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, tr] = await Promise.all([
        apiClient<ReportSummary>('/api/reports/summary', { query: { period, date: anchor } }),
        apiClient<TopProduct[]>('/api/reports/top-products', { query: { period, date: anchor, limit: 5 } }),
        apiClient<ReportTrendPoint[]>('/api/reports/trend', { query: { period } }),
      ]);
      setSummary(s);
      setTop(t);
      setTrend(tr);
    } finally {
      setLoading(false);
    }
  }, [period, anchor]);

  useEffect(() => {
    void load();
  }, [load]);

  function changePeriod(p: Period) {
    setPeriod(p);
    setAnchor((a) => normalizeAnchor(p, a));
  }

  async function exportCsv() {
    setExporting(true);
    try {
      await apiDownload(
        `/api/reports/export?period=${period}&date=${anchor}`,
        `laporan-${period}-${anchor}.csv`,
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900">Laporan Penjualan</h1>
          <p className="text-xs text-gray-400">Ringkasan performa toko Anda</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period: segmented control */}
          <div
            className="flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm"
            role="radiogroup"
            aria-label="Periode laporan"
          >
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={period === p.value}
                onClick={() => changePeriod(p.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  period === p.value ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Window navigator: prev / label / next / jump */}
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-1.5 py-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAnchor((a) => stepAnchor(period, a, -1))}
              aria-label="Periode sebelumnya"
              title="Periode sebelumnya"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
            </Button>
            <div className="min-w-[9.5rem] text-center">
              <div className="text-xs font-semibold text-gray-800">{windowLabel(period, anchor)}</div>
              <div className="text-[10px] text-gray-400">{rangeLabel(period, anchor)}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => canGoNext && setAnchor((a) => stepAnchor(period, a, 1))}
              disabled={!canGoNext}
              aria-label="Periode berikutnya"
              title={canGoNext ? 'Periode berikutnya' : 'Sudah periode terkini'}
            >
              <Icon name="chevron-right" className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={anchor}
              max={today}
              onChange={(e) => e.target.value && setAnchor(normalizeAnchor(period, e.target.value))}
              className="h-8 w-[9.5rem] text-xs"
              aria-label="Lompat ke tanggal"
              title="Lompat ke tanggal tertentu"
            />
          </div>

          {!isCurrent && (
            <Button variant="secondary" size="sm" onClick={() => setAnchor(normalizeAnchor(period, today))}>
              Kembali ke kini
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={exporting}>
            <Icon name="download" className="h-3.5 w-3.5" />
            {exporting ? 'Menyiapkan…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton className="mb-2 h-3.5 w-24" />
                  <Skeleton className="h-8 w-36" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mb-4">
            <CardContent>
              <TableSkeleton rows={4} />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat icon="wallet" label="Total pendapatan" value={formatCurrency(summary?.total_revenue ?? 0)} />
            <Stat icon="receipt" label="Jumlah pesanan" value={String(summary?.total_orders ?? 0)} />
            <Stat icon="chart" label="Rata-rata per pesanan" value={formatCurrency(summary?.avg_order_value ?? 0)} />
          </div>

          {/* Trend chart (last N windows ending now) */}
          <Card className="mb-4">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Tren pendapatan</CardTitle>
              <span className="text-xs text-gray-400">
                {trend.length} {period === 'daily' ? 'hari' : period === 'weekly' ? 'minggu' : period === 'monthly' ? 'bulan' : 'tahun'} terakhir
              </span>
            </CardHeader>
            <CardContent>
              <TrendChart period={period} points={trend} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Produk terlaris</CardTitle>
              <span className="text-xs text-gray-400">{windowLabel(period, anchor)}</span>
            </CardHeader>
            <CardContent>
              {top.length === 0 ? (
                <EmptyState
                  icon="chart"
                  title="Belum ada penjualan"
                  description="Belum ada transaksi pada periode ini."
                  className="py-8"
                />
              ) : (
                <div className="overflow-x-auto">
                  <TopProductsTable top={top} />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/** Pure-CSS bar chart (no chart library needed at this scale). */
function TrendChart({ period, points }: { period: Period; points: ReportTrendPoint[] }) {
  const max = Math.max(...points.map((p) => Number(p.revenue)), 1);
  return (
    <div className="flex h-40 items-end gap-1.5 sm:gap-2.5" role="img" aria-label="Grafik tren pendapatan">
      {points.map((p, i) => {
        const value = Number(p.revenue);
        const pct = Math.max(2, (value / max) * 100);
        const isLast = i === points.length - 1;
        return (
          <div key={p.bucket} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="w-full truncate text-center text-[9px] font-medium tabular-nums text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 sm:text-[10px]">
              {formatCurrency(value)}
            </span>
            <div
              className={cn(
                'w-full rounded-t-md transition-colors',
                isLast ? 'bg-brand-500' : 'bg-brand-200 group-hover:bg-brand-400',
              )}
              style={{ height: `${pct}%` }}
              title={`${trendBucketLabel(period, p.bucket)}: ${formatCurrency(value)} (${p.orders} order)`}
            />
            <span className="w-full truncate text-center text-[9px] text-gray-400 sm:text-[10px]">
              {trendBucketLabel(period, p.bucket)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TopProductsTable({ top }: { top: TopProduct[] }) {
  const maxQty = Math.max(...top.map((p) => p.quantity_sold), 1);
  return (
    <table className="w-full min-w-[540px] text-sm">
      <thead>
        <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          <th className="pb-2.5">#</th>
          <th>Produk</th>
          <th className="w-1/3">Relatif</th>
          <th className="text-right">Terjual</th>
          <th className="text-right">Pendapatan</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {top.map((p, i) => (
          <tr key={p.product_name}>
            <td className="py-2.5">
              <span
                className={cn(
                  'grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold',
                  i === 0
                    ? 'bg-amber-100 text-amber-700'
                    : i === 1
                      ? 'bg-gray-200 text-gray-600'
                      : i === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-400',
                )}
              >
                {i + 1}
              </span>
            </td>
            <td className="font-medium text-gray-800">{p.product_name}</td>
            <td className="pr-6">
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.max(6, (p.quantity_sold / maxQty) * 100)}%` }}
                />
              </div>
            </td>
            <td className="text-right font-semibold tabular-nums text-gray-800">{p.quantity_sold}</td>
            <td className="text-right tabular-nums text-gray-600">{formatCurrency(p.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
