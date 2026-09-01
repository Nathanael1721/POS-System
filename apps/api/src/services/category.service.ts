import type { Category } from '@simplepos/shared';
import { sql } from '../db/client.js';
import { NotFoundError } from '../utils/errors.js';

export async function listCategories(storeId: string): Promise<Category[]> {
  return sql<Category[]>`
    SELECT * FROM categories
    WHERE store_id = ${storeId}
    ORDER BY sort_order ASC, name ASC
  `;
}

export async function createCategory(
  storeId: string,
  input: { name: string; sort_order: number },
): Promise<Category> {
  const rows = await sql<Category[]>`
    INSERT INTO categories (store_id, name, sort_order)
    VALUES (${storeId}, ${input.name}, ${input.sort_order})
    RETURNING *
  `;
  return rows[0]!;
}

export async function deleteCategory(storeId: string, id: string): Promise<void> {
  const rows = await sql<{ id: string }[]>`
    DELETE FROM categories WHERE id = ${id} AND store_id = ${storeId} RETURNING id
  `;
  if (rows.length === 0) throw new NotFoundError('Category not found');
}
