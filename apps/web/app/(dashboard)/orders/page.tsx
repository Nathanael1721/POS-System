'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Order, OrderItem, Payment, Paginated, Receipt, Store } from '@simplepos/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { tokenStore } from '@/lib/auth';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 10;

const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  paid: { label: 'Lunas', variant: 'success' },
  pending: { label: 'Menunggu', variant: 'warning' },
  cancelled: { label: 'Batal', variant: 'danger' },
};

const METHOD_LABEL: Record<string, string> = { cash: 'Tunai', qris: 'QRIS', card: 'Kartu' };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ order: Order; items: OrderItem[]; payment: Payment | null } | null>(null);
  const [reprint, setReprint] = useState<Receipt | null>(null);
  const [storeName, setStoreName] = useState('Toko');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [voiding, setVoiding] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidBusy, setVoidBusy] = useState(false);
  const [voidErr, setVoidErr] = useState<string | null>(null);

  // Store name for receipt reprints (best-effort).
  useEffect(() => {
    apiClient<Store>('/api/store')
      .then((s) => setStoreName(s.name))
      .catch(() => undefined);
  }, []);

  /** Build a printable receipt from a stored order (cetak ulang struk). */
  function buildReceipt(detail: { order: Order; items: OrderItem[]; payment: Payment | null }): Receipt {
    return {
      order_number: detail.order.order_number,
      store_name: storeName,
      cashier_name: '',
      items: detail.items.map((it) => ({
        product_name: it.product_name,
        unit_price: it.unit_price,
        quantity: it.quantity,
        subtotal: it.subtotal,
      })),
      subtotal: detail.order.subtotal,
      discount_percent: detail.order.discount_percent,
      discount_amount: detail.order.discount_amount,
      tax_percent: detail.order.tax_percent,
      tax_amount: detail.order.tax_amount,
      total: detail.order.total,
      payment_method: (detail.payment?.method ?? detail.order.payment_method)!,
      amount_paid: detail.payment?.amount_paid ?? detail.order.total,
      change_given: detail.payment?.change_given ?? '0',
      reference: detail.payment?.reference ?? null,
      created_at: detail.order.created_at,
    };
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<Paginated<Order>>('/api/orders', {
        query: { date: date || undefined, status: status || undefined, page, limit: PAGE_SIZE },
      });
      setOrders(data.data);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } finally {
      setLoading(false);
    }
  }, [date, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmVoid() {
    if (!voiding) return;
    setVoidErr(null);
    setVoidBusy(true);
    try {
      await apiClient(`/api/orders/${voiding.id}/void`, {
        method: 'POST',
        body: { reason: voidReason.trim() },
      });
      setVoiding(null);
      setVoidReason('');
      setSelected(null);
      void load();
    } catch (err) {
      setVoidErr(err instanceof ApiClientError ? err.message : 'Gagal membatalkan order');
    } finally {
      setVoidBusy(false);
    }
  }

  async function open(id: string) {
    const detail = await apiClient<{ order: Order; items: OrderItem[]; payment: Payment | null }>(
      `/api/orders/${id}`,
    );
    setSelected(detail);
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-3 lg:overflow-hidden">
      <div className="min-w-0 lg:col-span-2 lg:overflow-y-auto">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">Pesanan</h1>
            <p className="text-xs text-gray-500">Riwayat transaksi toko Anda</p>
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              className="w-40"
              aria-label="Filter tanggal"
            />
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-40"
              aria-label="Filter status"
            >
              <option value="">Semua status</option>
              <option value="paid">Lunas</option>
              <option value="pending">Menunggu</option>
              <option value="cancelled">Batal</option>
            </Select>
          </div>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={8} />
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon="receipt"
              title="Belum ada pesanan"
              description="Transaksi yang selesai diproses di kasir akan muncul di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-2.5 pl-5">No. Pesanan</th>
                    <th>Waktu</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th className="pr-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => {
                    const meta = STATUS_META[o.status] ?? { label: o.status, variant: 'neutral' as BadgeVariant };
                    return (
                      <tr key={o.id} className="transition-colors hover:bg-brand-50/40">
                        <td className="py-2.5 pl-5 font-mono text-xs font-medium text-gray-800">
                          {o.order_number}
                        </td>
                        <td className="text-gray-500">{formatDateTime(o.created_at)}</td>
                        <td>
                          <Badge variant={meta.variant} dot>
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="text-right font-semibold tabular-nums text-gray-800">
                          {formatCurrency(o.total)}
                        </td>
                        <td className="pr-4 text-right">
                          <button
                            type="button"
                            onClick={() => open(o.id)}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
                          >
                            <Icon name="eye" className="h-3.5 w-3.5" />
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && orders.length > 0 && (
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
              <Icon name="receipt" className="h-4 w-4 text-brand-600" />
              Detail pesanan
            </h2>
            {!selected ? (
              <EmptyState
                icon="eye"
                title="Belum dipilih"
                description="Klik Detail pada salah satu pesanan untuk melihat rinciannya."
                className="py-8"
              />
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold text-gray-800">
                      {selected.order.order_number}
                    </p>
                    <Badge variant={STATUS_META[selected.order.status]?.variant ?? 'neutral'} dot>
                      {STATUS_META[selected.order.status]?.label ?? selected.order.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(selected.order.created_at)}</p>
                </div>
                <ul className="divide-y divide-gray-100 rounded-lg bg-gray-50 px-3">
                  {selected.items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-gray-700">
                        {it.product_name} <span className="text-gray-500">× {it.quantity}</span>
                      </span>
                      <span className="font-medium tabular-nums text-gray-800">
                        {formatCurrency(it.subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1">
                  <Row label="Subtotal" value={formatCurrency(selected.order.subtotal)} />
                  <Row label="Diskon" value={`− ${formatCurrency(selected.order.discount_amount)}`} />
                  <Row label="Pajak" value={formatCurrency(selected.order.tax_amount)} />
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(selected.order.total)}</span>
                  </div>
                </div>
                {selected.payment && (
                  <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800 ring-1 ring-inset ring-brand-600/10">
                    Dibayar {formatCurrency(selected.payment.amount_paid)} via{' '}
                    {METHOD_LABEL[selected.payment.method] ?? selected.payment.method}
                    {selected.payment.reference ? ` · Ref: ${selected.payment.reference}` : ''}
                  </p>
                )}
                {selected.payment && selected.order.status === 'paid' && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setReprint(buildReceipt(selected))}
                  >
                    <Icon name="printer" className="h-4 w-4" />
                    Cetak Ulang Struk
                  </Button>
                )}
                {selected.order.status === 'paid' && canVoid(selected.order) && (
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => {
                      setVoiding(selected.order);
                      setVoidReason('');
                      setVoidErr(null);
                    }}
                  >
                    <Icon name="x" className="h-4 w-4" />
                    Batalkan Order
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {reprint && <ReceiptModal receipt={reprint} onClose={() => setReprint(null)} />}

      {voiding && (
        <Modal title="Batalkan Order" onClose={() => setVoiding(null)}>
          <p className="mb-3 text-sm leading-relaxed text-gray-500">
            Order <span className="font-mono font-semibold text-gray-700">{voiding.order_number}</span>{' '}
            ({formatCurrency(voiding.total)}) akan dibatalkan dan stok produk dikembalikan. Tindakan
            ini tercatat di audit log.
          </p>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Alasan pembatalan</label>
          <Input
            placeholder="mis. salah input jumlah"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            autoFocus
          />
          {voidErr && <p className="mt-2 text-sm text-red-600">{voidErr}</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setVoiding(null)} disabled={voidBusy}>
              Batal
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={confirmVoid}
              disabled={voidBusy || voidReason.trim().length < 3}
            >
              {voidBusy ? 'Membatalkan…' : 'Ya, Batalkan'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Owner may void any paid order; a cashier only their own. */
function canVoid(order: Order): boolean {
  const me = tokenStore.getUser();
  if (!me) return false;
  return me.role === 'owner' || me.id === order.cashier_id;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="tabular-nums text-gray-700">{value}</span>
    </div>
  );
}
