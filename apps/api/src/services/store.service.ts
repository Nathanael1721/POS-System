import type { Store, UpdateStoreInput } from '@simplepos/shared';
import { sql } from '../db/client.js';
import { NotFoundError } from '../utils/errors.js';

export async function getStore(storeId: string): Promise<Store> {
  const rows = await sql<Store[]>`SELECT * FROM stores WHERE id = ${storeId} LIMIT 1`;
  const store = rows[0];
  if (!store) throw new NotFoundError('Store not found');
  return store;
}

/** Whether the shift/cash-drawer system is enabled for a store. */
export async function isShiftEnabled(storeId: string): Promise<boolean> {
  const rows = await sql<{ shift_enabled: boolean }[]>`
    SELECT shift_enabled FROM stores WHERE id = ${storeId} LIMIT 1
  `;
  return rows[0]?.shift_enabled ?? false;
}

export async function updateStore(storeId: string, input: UpdateStoreInput): Promise<Store> {
  const fields: Record<string, unknown> = {};
  if (input.name !== undefined) fields.name = input.name;
  if (input.address !== undefined) fields.address = input.address;
  if (input.shift_enabled !== undefined) fields.shift_enabled = input.shift_enabled;
  if (input.default_tax_percent !== undefined) fields.default_tax_percent = input.default_tax_percent;
  if (input.low_stock_threshold !== undefined) fields.low_stock_threshold = input.low_stock_threshold;
  if (input.auto_print_receipt !== undefined) fields.auto_print_receipt = input.auto_print_receipt;

  const rows = await sql<Store[]>`
    UPDATE stores SET ${sql(fields)} WHERE id = ${storeId} RETURNING *
  `;
  if (rows.length === 0) throw new NotFoundError('Store not found');
  return rows[0]!;
}
