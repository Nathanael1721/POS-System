'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Shift, ShiftWithSummary, Paginated } from '@simplepos/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 10;

export default function ShiftHistoryPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ShiftWithSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<Paginated<Shift>>('/api/shifts', {
        query: { status: status || undefined, page, limit: PAGE_SIZE },
      });
      setShifts(data.data);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(id: string) {
    const d = await apiClient<ShiftWithSummary>(`/api/shifts/${id}`);
    setDetail(d);
  }

  function diffClass(v: string | null): string {
    const n = Number(v ?? 0);
    if (n === 0) return 'text-gray-700';
    return n > 0 ? 'font-semibold text-amber-600' : 'font-semibold text-red-600';
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-3 lg:overflow-hidden">
      <div className="min-w-0 lg:col-span-2 lg:overflow-y-auto">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">Riwayat Shift</h1>
            <p className="text-xs text-gray-500">Rekonsiliasi kas per shift kasir</p>
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-40"
            aria-label="Filter status shift"
          >
            <option value="">Semua status</option>
            <option value="open">Terbuka</option>
            <option value="closed">Tertutup</option>
          </Select>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={6} />
            </div>
          ) : shifts.length === 0 ? (
            <EmptyState
              icon="clock"
              title="Belum ada shift"
              description="Riwayat shift akan muncul di sini setelah kasir membuka dan menutup shift."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-2.5 pl-5">Dibuka</th>
                    <th>Status</th>
                    <th className="text-right">Order</th>
                    <th className="text-right">Penjualan</th>
                    <th className="text-right">Selisih</th>
                    <th className="pr-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shifts.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-brand-50/40">
                      <td className="py-2.5 pl-5 text-gray-600">{formatDateTime(s.opened_at)}</td>
                      <td>
                        <Badge variant={s.status === 'open' ? 'brand' : 'neutral'} dot>
                          {s.status === 'open' ? 'Terbuka' : 'Tertutup'}
                        </Badge>
                      </td>
                      <td className="text-right tabular-nums text-gray-700">{s.order_count}</td>
                      <td className="text-right font-medium tabular-nums text-gray-800">
                        {formatCurrency(s.total_sales)}
                      </td>
                      <td className={`text-right tabular-nums ${diffClass(s.difference)}`}>
                        {s.status === 'closed' ? formatCurrency(s.difference ?? 0) : '—'}
                      </td>
                      <td className="pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => open(s.id)}
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
                        >
                          <Icon name="eye" className="h-3.5 w-3.5" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && shifts.length > 0 && (
            <div className="border-t border-gray-100">
              <Pagination page={page} total={total} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
      </div>

      <div className="lg:overflow-y-auto lg:pb-4">
        <Card className="h-fit">
          <CardContent>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Icon name="clock" className="h-4 w-4 text-brand-600" />
              Detail shift
            </h2>
            {!detail ? (
              <EmptyState
                icon="eye"
                title="Belum dipilih"
                description="Klik Detail pada salah satu shift untuk melihat rinciannya."
                className="py-8"
              />
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{detail.cashier_name ?? 'Kasir'}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDateTime(detail.shift.opened_at)}
                    {detail.shift.closed_at
                      ? ` — ${formatDateTime(detail.shift.closed_at)}`
                      : ' — berjalan'}
                  </p>
                </div>
                <div className="space-y-1 rounded-lg bg-gray-50 px-3 py-2.5">
                  <Row label="Modal awal" value={formatCurrency(detail.shift.opening_cash)} />
                  <Row label="Jumlah order" value={String(detail.summary.order_count)} />
                  <Row label="Total penjualan" value={formatCurrency(detail.summary.total_sales)} strong />
                  <Row label="Penjualan tunai" value={formatCurrency(detail.summary.cash_sales)} />
                  <Row label="Penjualan non-tunai" value={formatCurrency(detail.summary.noncash_sales)} />
                  <Row label="Kas masuk" value={formatCurrency(detail.summary.cash_in)} />
                  <Row label="Kas keluar" value={formatCurrency(detail.summary.cash_out)} />
                  <Row label="Kas seharusnya" value={formatCurrency(detail.summary.expected_cash)} strong />
                </div>
                {detail.shift.status === 'closed' && (
                  <div className="space-y-1">
                    <Row label="Kas dihitung" value={formatCurrency(detail.shift.counted_cash ?? 0)} />
                    <div
                      className={`flex justify-between border-t border-gray-100 pt-2 text-sm font-bold ${diffClass(detail.shift.difference)}`}
                    >
                      <span>Selisih</span>
                      <span className="tabular-nums">{formatCurrency(detail.shift.difference ?? 0)}</span>
                    </div>
                  </div>
                )}
                {detail.shift.notes && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-600/10">
                    Catatan: {detail.shift.notes}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? 'font-semibold tabular-nums text-gray-800' : 'tabular-nums text-gray-700'}>
        {value}
      </span>
    </div>
  );
}
