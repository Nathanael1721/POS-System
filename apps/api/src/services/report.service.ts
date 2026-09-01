import type {
  ReportSummary,
  ReportSummaryQuery,
  ReportPeriod,
  ReportTrendPoint,
  TopProduct,
  TopProductsQuery,
} from '@simplepos/shared';
import { sql } from '../db/client.js';

/**
 * Resolve a reporting period to an inclusive [start, end) date range based on
 * an anchor date (defaults to today, UTC).
 */
function periodRange(period: ReportPeriod, dateStr?: string): { start: string; end: string } {
  const anchor = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const d = anchor.getUTCDate();

  let start: Date;
  let end: Date;

  if (period === 'daily') {
    start = new Date(Date.UTC(y, m, d));
    end = new Date(Date.UTC(y, m, d + 1));
  } else if (period === 'weekly') {
    // Week starts Monday (ISO).
    const dow = (anchor.getUTCDay() + 6) % 7; // 0 = Monday
    start = new Date(Date.UTC(y, m, d - dow));
    end = new Date(Date.UTC(y, m, d - dow + 7));
  } else if (period === 'yearly') {
    start = new Date(Date.UTC(y, 0, 1));
    end = new Date(Date.UTC(y + 1, 0, 1));
  } else {
    start = new Date(Date.UTC(y, m, 1));
    end = new Date(Date.UTC(y, m + 1, 1));
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Sales summary for the period: total revenue, order count, average order
 * value. Only 'paid' orders count toward revenue.
 */
export async function getSummary(storeId: string, query: ReportSummaryQuery): Promise<ReportSummary> {
  const { start, end } = periodRange(query.period, query.date);

  const rows = await sql<{ total_revenue: string; total_orders: string; avg_order_value: string }[]>`
    SELECT
      COALESCE(SUM(total), 0)::text AS total_revenue,
      COUNT(*)::text AS total_orders,
      COALESCE(AVG(total), 0)::numeric(15,2)::text AS avg_order_value
    FROM orders
    WHERE store_id = ${storeId}
      AND status = 'paid'
      AND created_at >= ${start} AND created_at < ${end}
  `;

  const r = rows[0]!;
  return {
    total_revenue: r.total_revenue,
    total_orders: Number(r.total_orders),
    avg_order_value: r.avg_order_value,
  };
}

/**
 * Top products by quantity sold within the period (default top 5).
 */
export async function getTopProducts(storeId: string, query: TopProductsQuery): Promise<TopProduct[]> {
  const { start, end } = periodRange(query.period, query.date);

  const rows = await sql<{ product_name: string; quantity_sold: string; revenue: string }[]>`
    SELECT
      oi.product_name AS product_name,
      SUM(oi.quantity)::text AS quantity_sold,
      SUM(oi.subtotal)::text AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.store_id = ${storeId}
      AND o.status = 'paid'
      AND o.created_at >= ${start} AND o.created_at < ${end}
    GROUP BY oi.product_name
    ORDER BY SUM(oi.quantity) DESC, SUM(oi.subtotal) DESC
    LIMIT ${query.limit}
  `;

  return rows.map((r) => ({
    product_name: r.product_name,
    quantity_sold: Number(r.quantity_sold),
    revenue: r.revenue,
  }));
}

/** Bucket size per trend period: last N complete windows ending now. */
const TREND_POINTS: Record<ReportPeriod, { unit: 'day' | 'week' | 'month' | 'year'; count: number }> = {
  daily: { unit: 'day', count: 7 },
  weekly: { unit: 'week', count: 8 },
  monthly: { unit: 'month', count: 12 },
  yearly: { unit: 'year', count: 5 },
};

/** Truncate a Date to the start of its UTC day/week(Mon)/month/year. */
function truncateTo(unit: 'day' | 'week' | 'month' | 'year', d: Date): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (unit === 'day') return new Date(Date.UTC(y, m, day));
  if (unit === 'week') {
    const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
    return new Date(Date.UTC(y, m, day - dow));
  }
  if (unit === 'year') return new Date(Date.UTC(y, 0, 1));
  return new Date(Date.UTC(y, m, 1));
}

function addUnit(unit: 'day' | 'week' | 'month' | 'year', d: Date, n: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (unit === 'day') return new Date(Date.UTC(y, m, day + n));
  if (unit === 'week') return new Date(Date.UTC(y, m, day + 7 * n));
  if (unit === 'year') return new Date(Date.UTC(y + n, 0, 1));
  return new Date(Date.UTC(y, m + n, 1));
}

/**
 * Revenue/order trend: fixed series of buckets ending at the current window,
 * e.g. daily → last 7 days, monthly → last 12 months. Buckets are computed in
 * UTC to match the summary windows.
 */
export async function getTrend(storeId: string, period: ReportPeriod): Promise<ReportTrendPoint[]> {
  const { unit, count } = TREND_POINTS[period];
  const current = truncateTo(unit, new Date());
  const start = addUnit(unit, current, -(count - 1));
  const end = addUnit(unit, current, 1); // exclusive
  const step = { day: '1 day', week: '1 week', month: '1 month', year: '1 year' }[unit];

  const rows = await sql<{ bucket: string; revenue: string; orders: number }[]>`
    SELECT gs AS bucket,
           COALESCE(SUM(o.total), 0)::text AS revenue,
           COUNT(o.id)::int AS orders
    FROM generate_series(
      ${start.toISOString()}::timestamptz,
      ${end.toISOString()}::timestamptz - ${step}::interval,
      ${step}::interval
    ) AS gs
    LEFT JOIN orders o
      ON o.created_at >= gs
     AND o.created_at < gs + ${step}::interval
     AND o.store_id = ${storeId}
     AND o.status = 'paid'
    GROUP BY gs
    ORDER BY gs
  `;

  return rows.map((r) => ({ bucket: r.bucket, revenue: r.revenue, orders: r.orders }));
}

/** Escape one CSV field (RFC 4180: quote + double quotes inside). */
function csvField(value: string | number | null): string {
  const s = value === null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV export of all orders in the period window (owner download). Includes the
 * cashier name for accountability.
 */
export async function getOrdersCsv(storeId: string, query: ReportSummaryQuery): Promise<string> {
  const { start, end } = periodRange(query.period, query.date);

  const rows = await sql<
    Array<{
      order_number: string;
      created_at: string;
      status: string;
      payment_method: string | null;
      subtotal: string;
      discount_amount: string;
      tax_amount: string;
      total: string;
      cashier: string | null;
    }>
  >`
    SELECT o.order_number, o.created_at, o.status, o.payment_method,
           o.subtotal, o.discount_amount, o.tax_amount, o.total,
           u.name AS cashier
    FROM orders o
    LEFT JOIN users u ON u.id = o.cashier_id
    WHERE o.store_id = ${storeId}
      AND o.created_at >= ${start} AND o.created_at < ${end}
    ORDER BY o.created_at ASC
  `;

  const header = [
    'No. Pesanan',
    'Waktu',
    'Kasir',
    'Metode',
    'Status',
    'Subtotal',
    'Diskon',
    'Pajak',
    'Total',
  ].join(',');

  const lines = rows.map((r) =>
    [
      csvField(r.order_number),
      csvField(new Date(r.created_at).toISOString()),
      csvField(r.cashier),
      csvField(r.payment_method ?? ''),
      csvField(r.status),
      csvField(r.subtotal),
      csvField(r.discount_amount),
      csvField(r.tax_amount),
      csvField(r.total),
    ].join(','),
  );

  return [header, ...lines].join('\r\n');
}
