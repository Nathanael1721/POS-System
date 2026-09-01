import type { Sql } from '../db/client.js';

/**
 * Derive a short uppercase store prefix from the store name.
 * e.g. "SimplePOS Demo Store" -> "SDS" (falls back to "STR").
 */
export function storePrefix(storeName: string): string {
  const letters = storeName
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('');
  const prefix = letters.slice(0, 3) || 'STR';
  return prefix.padEnd(3, 'X');
}

function yyyymmdd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Generate the next order number for a store, formatted as
 *   {STORE_PREFIX}-{YYYYMMDD}-{5-digit-sequence}
 * The sequence resets daily per store.
 *
 * Must be called inside the order transaction (`tx`) so the count and the
 * subsequent INSERT are consistent. Combined with the UNIQUE constraint on
 * orders.order_number, concurrent inserts that race to the same number will
 * cause one transaction to fail and roll back rather than duplicate.
 */
export async function nextOrderNumber(
  tx: Sql,
  storeId: string,
  storeName: string,
  now: Date,
): Promise<string> {
  const prefix = storePrefix(storeName);
  const datePart = yyyymmdd(now);
  const likePattern = `${prefix}-${datePart}-%`;

  const rows = await tx<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM orders
    WHERE store_id = ${storeId}
      AND order_number LIKE ${likePattern}
  `;

  const todayCount = Number(rows[0]?.count ?? '0');
  const sequence = String(todayCount + 1).padStart(5, '0');
  return `${prefix}-${datePart}-${sequence}`;
}
