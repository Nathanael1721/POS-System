'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuditLogWithUser, Paginated } from '@simplepos/shared';
import { Card } from '@/components/ui/card';
import { IconInput } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { apiClient } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 20;

/** Action → badge color for scannability. */
function actionBadge(action: string): 'brand' | 'danger' | 'warning' | 'neutral' {
  if (action.startsWith('order.confirm')) return 'brand';
  if (action.startsWith('order.void')) return 'danger';
  if (action.includes('delete') || action.includes('logout')) return 'warning';
  return 'neutral';
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<Paginated<AuditLogWithUser>>('/api/audit-logs', {
        query: { page, limit: PAGE_SIZE, action: actionFilter || undefined },
      });
      setLogs(data.data);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="h-full overflow-y-auto p-4 pb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900">Audit Log</h1>
          <p className="text-xs text-gray-400">Jejak semua aksi yang mengubah data toko</p>
        </div>
        <IconInput
          icon={<Icon name="search" className="h-4 w-4" />}
          placeholder="Filter aksi (mis. order, product.delete)"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="w-72"
          aria-label="Filter aksi"
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-5">
            <TableSkeleton rows={10} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon="info"
            title="Tidak ada catatan"
            description="Belum ada aksi yang cocok dengan filter ini."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <th className="py-2.5 pl-5">Waktu</th>
                    <th>Pengguna</th>
                    <th>Aksi</th>
                    <th>IP</th>
                    <th className="pr-5">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="align-top transition-colors hover:bg-brand-50/40">
                      <td className="whitespace-nowrap py-2.5 pl-5 text-gray-600">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="text-gray-800">{log.user_name ?? '—'}</td>
                      <td>
                        <Badge variant={actionBadge(log.action)}>{log.action}</Badge>
                      </td>
                      <td className="font-mono text-xs text-gray-400">{log.ip_address ?? '—'}</td>
                      <td className="pr-5">
                        {log.payload && Object.keys(log.payload as object).length > 0 ? (
                          <details className="group">
                            <summary className="cursor-pointer list-none text-xs font-medium text-brand-700 transition-colors hover:text-brand-800">
                              Lihat payload
                            </summary>
                            <pre className="mt-1.5 max-w-md overflow-x-auto rounded-lg bg-gray-50 p-2.5 font-mono text-[11px] leading-relaxed text-gray-600">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100">
              <Pagination page={page} total={total} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
