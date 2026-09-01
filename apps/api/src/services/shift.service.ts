import type {
  Shift,
  ShiftSummary,
  ShiftWithSummary,
  CashMovement,
  CashMovementInput,
  OpenShiftInput,
  CloseShiftInput,
  ListShiftsQuery,
  Paginated,
} from '@simplepos/shared';
import { sql } from '../db/client.js';
import type { Sql } from '../db/client.js';
import type { AuthUser } from '../types.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { toCents, fromCents } from '../utils/money.js';
import { isShiftEnabled } from './store.service.js';

function storeIdOrThrow(user: AuthUser): string {
  if (!user.store_id) throw new ValidationError('User is not assigned to a store', { fields: [] });
  return user.store_id;
}

/**
 * Aggregate a shift's paid orders and cash movements into a live cash summary.
 * expected_cash = opening_cash + cash_sales + cash_in − cash_out
 * (uang tunai yang seharusnya ada di laci).
 */
async function computeSummary(
  db: Sql,
  shiftId: string,
  openingCash: string,
): Promise<ShiftSummary> {
  const rows = await db<
    { order_count: number; total_sales: string; cash_sales: string; noncash_sales: string }[]
  >`
    SELECT
      COUNT(*)::int AS order_count,
      COALESCE(SUM(total), 0)::text AS total_sales,
      COALESCE(SUM(total) FILTER (WHERE payment_method = 'cash'), 0)::text AS cash_sales,
      COALESCE(SUM(total) FILTER (WHERE payment_method <> 'cash'), 0)::text AS noncash_sales
    FROM orders
    WHERE shift_id = ${shiftId} AND status = 'paid'
  `;
  const moves = await db<{ cash_in: string; cash_out: string }[]>`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE type = 'in'), 0)::text AS cash_in,
      COALESCE(SUM(amount) FILTER (WHERE type = 'out'), 0)::text AS cash_out
    FROM shift_cash_movements
    WHERE shift_id = ${shiftId}
  `;
  const r = rows[0]!;
  const m = moves[0]!;
  const expectedCents =
    toCents(openingCash) + toCents(r.cash_sales) + toCents(m.cash_in) - toCents(m.cash_out);
  return {
    order_count: r.order_count,
    total_sales: r.total_sales,
    cash_sales: r.cash_sales,
    noncash_sales: r.noncash_sales,
    cash_in: m.cash_in,
    cash_out: m.cash_out,
    expected_cash: fromCents(expectedCents),
  };
}

/** Find the caller's currently open shift (or null). Optionally lock for update. */
export async function findOpenShift(db: Sql, cashierId: string, lock = false): Promise<Shift | null> {
  const rows = lock
    ? await db<Shift[]>`SELECT * FROM shifts WHERE cashier_id = ${cashierId} AND status = 'open' LIMIT 1 FOR UPDATE`
    : await db<Shift[]>`SELECT * FROM shifts WHERE cashier_id = ${cashierId} AND status = 'open' LIMIT 1`;
  return rows[0] ?? null;
}

/** Open a new shift for the caller. Rejects if one is already open or shift is off. */
export async function openShift(user: AuthUser, input: OpenShiftInput): Promise<Shift> {
  const storeId = storeIdOrThrow(user);
  if (!(await isShiftEnabled(storeId))) {
    throw new ConflictError('Fitur shift tidak aktif untuk toko ini. Aktifkan di Pengaturan Toko.');
  }
  const existing = await findOpenShift(sql, user.id);
  if (existing) {
    throw new ConflictError('Anda masih punya shift yang terbuka. Tutup dulu sebelum membuka shift baru.');
  }
  const rows = await sql<Shift[]>`
    INSERT INTO shifts (store_id, cashier_id, status, opening_cash)
    VALUES (${storeId}, ${user.id}, 'open', ${fromCents(toCents(input.opening_cash))})
    RETURNING *
  `;
  return rows[0]!;
}

/** Close the caller's open shift and reconcile the cash drawer. */
export async function closeShift(user: AuthUser, input: CloseShiftInput): Promise<ShiftWithSummary> {
  return sql.begin(async (tx) => {
    const shift = await findOpenShift(tx as unknown as Sql, user.id, true);
    if (!shift) throw new NotFoundError('Tidak ada shift terbuka untuk ditutup');

    const summary = await computeSummary(tx as unknown as Sql, shift.id, shift.opening_cash);
    const countedCents = toCents(input.counted_cash);
    const expectedCents = toCents(summary.expected_cash);
    const differenceCents = countedCents - expectedCents;

    const rows = await tx<Shift[]>`
      UPDATE shifts SET
        status = 'closed',
        counted_cash = ${fromCents(countedCents)},
        expected_cash = ${fromCents(expectedCents)},
        difference = ${fromCents(differenceCents)},
        total_sales = ${summary.total_sales},
        cash_sales = ${summary.cash_sales},
        noncash_sales = ${summary.noncash_sales},
        cash_in = ${summary.cash_in},
        cash_out = ${summary.cash_out},
        order_count = ${summary.order_count},
        notes = ${input.notes ?? null},
        closed_at = now()
      WHERE id = ${shift.id}
      RETURNING *
    `;
    return { shift: rows[0]!, summary, cashier_name: user.name };
  });
}

/** Current open shift for the caller, with live summary (or null shift). */
export async function getCurrentShift(user: AuthUser): Promise<ShiftWithSummary | { shift: null }> {
  const shift = await findOpenShift(sql, user.id);
  if (!shift) return { shift: null };
  const summary = await computeSummary(sql, shift.id, shift.opening_cash);
  return { shift, summary, cashier_name: user.name };
}

/** List shifts. Owner sees all in store; cashier sees own only. */
export async function listShifts(user: AuthUser, query: ListShiftsQuery): Promise<Paginated<Shift>> {
  const storeId = storeIdOrThrow(user);
  const offset = (query.page - 1) * query.limit;
  const cashierFilter = user.role === 'cashier' ? user.id : null;

  const rows = await sql<Array<Shift & { total_count: string }>>`
    SELECT *, COUNT(*) OVER()::text AS total_count
    FROM shifts
    WHERE store_id = ${storeId}
      AND (${query.status ?? null}::text IS NULL OR status = ${query.status ?? null})
      AND (${cashierFilter}::uuid IS NULL OR cashier_id = ${cashierFilter})
    ORDER BY opened_at DESC
    LIMIT ${query.limit} OFFSET ${offset}
  `;
  const total = rows.length > 0 ? Number(rows[0]!.total_count) : 0;
  const data = rows.map(({ total_count: _t, ...s }) => s as Shift);
  return { data, page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) };
}

/** Shift detail with summary. Cashier may only read own shift. */
export async function getShiftById(user: AuthUser, id: string): Promise<ShiftWithSummary> {
  const storeId = storeIdOrThrow(user);
  const rows = await sql<Array<Shift & { cashier_name: string | null }>>`
    SELECT s.*, u.name AS cashier_name
    FROM shifts s
    LEFT JOIN users u ON u.id = s.cashier_id
    WHERE s.id = ${id} AND s.store_id = ${storeId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new NotFoundError('Shift not found');
  if (user.role === 'cashier' && row.cashier_id !== user.id) {
    throw new NotFoundError('Shift not found');
  }
  const { cashier_name, ...shift } = row;

  // For a closed shift use stored snapshot; for an open one compute live.
  const summary: ShiftSummary =
    shift.status === 'closed'
      ? {
          order_count: shift.order_count,
          total_sales: shift.total_sales,
          cash_sales: shift.cash_sales,
          noncash_sales: shift.noncash_sales,
          cash_in: shift.cash_in,
          cash_out: shift.cash_out,
          expected_cash: shift.expected_cash ?? fromCents(toCents(shift.opening_cash)),
        }
      : await computeSummary(sql, shift.id, shift.opening_cash);

  return { shift: shift as Shift, summary, cashier_name };
}

/** Record a petty-cash movement (in/out) on the caller's open shift. */
export async function addCashMovement(user: AuthUser, input: CashMovementInput): Promise<CashMovement> {
  const shift = await findOpenShift(sql, user.id);
  if (!shift) throw new NotFoundError('Tidak ada shift terbuka');
  const rows = await sql<CashMovement[]>`
    INSERT INTO shift_cash_movements (shift_id, type, amount, reason, created_by)
    VALUES (${shift.id}, ${input.type}, ${fromCents(toCents(input.amount))}, ${input.reason ?? null}, ${user.id})
    RETURNING *
  `;
  return rows[0]!;
}

/** List cash movements for a shift. */
export async function listCashMovements(shiftId: string): Promise<CashMovement[]> {
  return sql<CashMovement[]>`
    SELECT * FROM shift_cash_movements WHERE shift_id = ${shiftId} ORDER BY created_at ASC
  `;
}
