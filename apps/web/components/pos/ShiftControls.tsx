'use client';

import { useState } from 'react';
import type { Shift, ShiftSummary, ShiftWithSummary } from '@simplepos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { formatCurrency, formatThousands, digitsOnly, formatDateTime } from '@/lib/utils';

/** Full-area gate shown when the cashier has no open shift. */
export function OpenShiftCard({ onOpen }: { onOpen: (cash: number) => Promise<void> }) {
  const [cash, setCash] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      await onOpen(Number(cash || 0));
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Gagal membuka shift');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Icon name="clock" className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Buka Shift Kasir</h2>
          <p className="mb-4 mt-1 text-sm leading-relaxed text-gray-500">
            Masukkan modal kas awal (uang di laci) untuk mulai berjualan. Semua transaksi akan
            tercatat pada shift ini.
          </p>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Modal awal (Rp)</label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={formatThousands(cash)}
            onChange={(e) => setCash(digitsOnly(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            className="font-semibold tabular-nums"
            autoFocus
          />
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <Button className="mt-4 w-full" size="lg" disabled={busy} onClick={submit}>
            {busy ? 'Membuka…' : 'Buka Shift'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Compact status bar shown above the POS while a shift is open. */
export function ShiftBar({
  shift,
  summary,
  onClose,
  onCashIn,
  onCashOut,
}: {
  shift: Shift;
  summary: ShiftSummary | null;
  onClose: () => void;
  onCashIn: () => void;
  onCashOut: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        <span className="flex items-center gap-1.5 font-semibold text-brand-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
          Shift aktif
        </span>
        <span>Buka: {formatDateTime(shift.opened_at)}</span>
        <span>
          Order: <span className="font-semibold tabular-nums">{summary?.order_count ?? 0}</span>
        </span>
        <span>
          Tunai:{' '}
          <span className="font-semibold tabular-nums">
            {formatCurrency(summary?.cash_sales ?? 0)}
          </span>
        </span>
        {Number(summary?.cash_in ?? 0) > 0 && (
          <span>Kas masuk: {formatCurrency(summary?.cash_in ?? 0)}</span>
        )}
        {Number(summary?.cash_out ?? 0) > 0 && (
          <span>Kas keluar: {formatCurrency(summary?.cash_out ?? 0)}</span>
        )}
        <span className="font-medium text-gray-800">
          Kas seharusnya:{' '}
          <span className="font-semibold tabular-nums">
            {formatCurrency(summary?.expected_cash ?? shift.opening_cash)}
          </span>
        </span>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="secondary" onClick={onCashIn} title="Catat kas masuk">
          <Icon name="plus" className="h-3.5 w-3.5" />
          Kas
        </Button>
        <Button size="sm" variant="secondary" onClick={onCashOut} title="Catat kas keluar">
          <Icon name="minus" className="h-3.5 w-3.5" />
          Kas
        </Button>
        <Button size="sm" onClick={onClose}>
          Tutup Shift
        </Button>
      </div>
    </div>
  );
}

/** Record a petty-cash movement (in/out) during an open shift. */
export function CashMovementModal({
  type,
  onDone,
  onCancel,
}: {
  type: 'in' | 'out';
  onDone: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isIn = type === 'in';

  async function submit() {
    if (Number(amount || 0) <= 0) {
      setErr('Jumlah harus lebih dari 0');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await apiClient('/api/shifts/cash-movement', {
        method: 'POST',
        body: { type, amount: Number(amount), reason: reason.trim() || null },
      });
      onDone();
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Gagal menyimpan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={isIn ? 'Kas Masuk' : 'Kas Keluar'} onClose={onCancel}>
      <p className="mb-4 text-sm leading-relaxed text-gray-500">
        {isIn
          ? 'Tambahan uang ke laci (mis. tambah modal).'
          : 'Pengeluaran kas (mis. beli galon, kembalian).'}
      </p>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">Jumlah (Rp)</label>
      <Input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={formatThousands(amount)}
        onChange={(e) => setAmount(digitsOnly(e.target.value))}
        className="font-semibold tabular-nums"
        autoFocus
      />
      <label className="mb-1.5 mt-3 block text-xs font-medium text-gray-600">
        Alasan (opsional)
      </label>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. beli galon" />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
          Batal
        </Button>
        <Button className="flex-1" onClick={submit} disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </Modal>
  );
}

/** Modal to count cash and close the shift, then show the reconciliation. */
export function CloseShiftModal({
  summary,
  onConfirm,
  onCancel,
}: {
  summary: ShiftSummary | null;
  onConfirm: (counted: number, notes: string) => Promise<ShiftWithSummary>;
  onCancel: () => void;
}) {
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Shift | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const res = await onConfirm(Number(counted || 0), notes);
      setResult(res.shift);
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : 'Gagal menutup shift');
    } finally {
      setBusy(false);
    }
  }

  const expected = summary?.expected_cash ?? '0';
  const diff = Number(result?.difference ?? 0);

  return (
    <Modal
      title={result ? 'Shift Ditutup' : 'Tutup Shift'}
      onClose={onCancel}
      className="max-w-md"
    >
      {result ? (
        <>
          <div
            className={
              diff === 0
                ? 'mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5 ring-1 ring-inset ring-emerald-600/10'
                : diff > 0
                  ? 'mb-4 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2.5 ring-1 ring-inset ring-amber-600/15'
                  : 'mb-4 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2.5 ring-1 ring-inset ring-red-600/10'
            }
          >
            <span className="text-sm font-medium text-gray-700">Selisih kas</span>
            <span className="text-base font-bold tabular-nums text-gray-900">
              {formatCurrency(result.difference ?? 0)}
            </span>
          </div>
          <dl className="space-y-1 text-sm">
            <Row label="Total penjualan" value={formatCurrency(result.total_sales)} />
            <Row label="Penjualan tunai" value={formatCurrency(result.cash_sales)} />
            <Row label="Penjualan non-tunai" value={formatCurrency(result.noncash_sales)} />
            <Row label="Kas masuk" value={formatCurrency(result.cash_in)} />
            <Row label="Kas keluar" value={formatCurrency(result.cash_out)} />
            <Row label="Kas seharusnya" value={formatCurrency(result.expected_cash ?? 0)} />
            <Row label="Kas dihitung" value={formatCurrency(result.counted_cash ?? 0)} />
          </dl>
          <Button className="mt-4 w-full" onClick={onCancel}>
            Selesai
          </Button>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm leading-relaxed text-gray-500">
            Hitung uang fisik di laci, lalu masukkan jumlahnya untuk rekonsiliasi.
          </p>
          <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
            <Row label="Order" value={String(summary?.order_count ?? 0)} />
            <Row label="Penjualan tunai" value={formatCurrency(summary?.cash_sales ?? 0)} />
            {Number(summary?.cash_in ?? 0) > 0 && (
              <Row label="Kas masuk" value={formatCurrency(summary?.cash_in ?? 0)} />
            )}
            {Number(summary?.cash_out ?? 0) > 0 && (
              <Row label="Kas keluar" value={formatCurrency(summary?.cash_out ?? 0)} />
            )}
            <Row label="Kas seharusnya" value={formatCurrency(expected)} strong />
          </div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Kas dihitung (Rp)</label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={formatThousands(counted)}
            onChange={(e) => setCounted(digitsOnly(e.target.value))}
            className="font-semibold tabular-nums"
            autoFocus
          />
          <label className="mb-1.5 mt-3 block text-xs font-medium text-gray-600">
            Catatan (opsional)
          </label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="mis. selisih karena…" />
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
              Batal
            </Button>
            <Button className="flex-1" onClick={submit} disabled={busy}>
              {busy ? 'Menutup…' : 'Tutup & Hitung'}
            </Button>
          </div>
        </>
      )}
    </Modal>
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
