import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsQuery,
  Product,
  Paginated,
} from '@simplepos/shared';
import { sql } from '../db/client.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

/**
 * List products for a store with optional category/search filters and
 * pagination. All values are parameterized — no string interpolation.
 */
export async function listProducts(
  storeId: string,
  query: ListProductsQuery,
): Promise<Paginated<Product>> {
  const offset = (query.page - 1) * query.limit;
  const search = query.search ? `%${query.search}%` : null;

  const rows = await sql<Array<Product & { total_count: string }>>`
    SELECT *, COUNT(*) OVER()::text AS total_count
    FROM products
    WHERE store_id = ${storeId}
      AND (${query.category_id ?? null}::uuid IS NULL OR category_id = ${query.category_id ?? null})
      AND (${search}::text IS NULL OR name ILIKE ${search} OR sku ILIKE ${search} OR barcode ILIKE ${search})
    ORDER BY created_at DESC
    LIMIT ${query.limit}
    OFFSET ${offset}
  `;

  const total = rows.length > 0 ? Number(rows[0]!.total_count) : 0;
  const data = rows.map(({ total_count: _t, ...p }) => p as Product);

  return {
    data,
    page: query.page,
    limit: query.limit,
    total,
    total_pages: Math.ceil(total / query.limit),
  };
}

export async function getProductById(storeId: string, id: string): Promise<Product> {
  const rows = await sql<Product[]>`
    SELECT * FROM products WHERE id = ${id} AND store_id = ${storeId} LIMIT 1
  `;
  const product = rows[0];
  if (!product) throw new NotFoundError('Product not found');
  return product;
}

/** Exact lookup by barcode within a store — used for scan-to-add at the POS. */
export async function getProductByBarcode(storeId: string, barcode: string): Promise<Product> {
  const rows = await sql<Product[]>`
    SELECT * FROM products
    WHERE store_id = ${storeId} AND barcode = ${barcode}
    LIMIT 1
  `;
  const product = rows[0];
  if (!product) throw new NotFoundError('No product found for this barcode');
  return product;
}

/** Guard: barcode must be unique within the store (excluding a given product on update). */
async function assertBarcodeAvailable(storeId: string, barcode: string, exceptId?: string): Promise<void> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM products
    WHERE store_id = ${storeId} AND barcode = ${barcode}
      AND (${exceptId ?? null}::uuid IS NULL OR id <> ${exceptId ?? null})
    LIMIT 1
  `;
  if (rows.length > 0) {
    throw new ConflictError(`Barcode "${barcode}" is already used by another product`);
  }
}

export async function createProduct(storeId: string, input: CreateProductInput): Promise<Product> {
  if (input.barcode) await assertBarcodeAvailable(storeId, input.barcode);
  const rows = await sql<Product[]>`
    INSERT INTO products (store_id, category_id, name, sku, barcode, price, stock, image_url, is_active)
    VALUES (
      ${storeId},
      ${input.category_id ?? null},
      ${input.name},
      ${input.sku ?? null},
      ${input.barcode ?? null},
      ${input.price},
      ${input.stock},
      ${input.image_url ?? null},
      ${input.is_active}
    )
    RETURNING *
  `;
  return rows[0]!;
}

/**
 * Partial update. Only the provided fields are changed; updated_at is bumped.
 */
export async function updateProduct(
  storeId: string,
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  // Ensure it exists in this store first (avoids cross-store updates).
  await getProductById(storeId, id);
  if (input.barcode) await assertBarcodeAvailable(storeId, input.barcode, id);

  const fields: Record<string, unknown> = {};
  if (input.category_id !== undefined) fields.category_id = input.category_id;
  if (input.name !== undefined) fields.name = input.name;
  if (input.sku !== undefined) fields.sku = input.sku;
  if (input.barcode !== undefined) fields.barcode = input.barcode;
  if (input.price !== undefined) fields.price = input.price;
  if (input.stock !== undefined) fields.stock = input.stock;
  if (input.image_url !== undefined) fields.image_url = input.image_url;
  if (input.is_active !== undefined) fields.is_active = input.is_active;
  fields.updated_at = new Date();

  const rows = await sql<Product[]>`
    UPDATE products
    SET ${sql(fields)}
    WHERE id = ${id} AND store_id = ${storeId}
    RETURNING *
  `;
  return rows[0]!;
}

export const ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Store (upsert) an uploaded image for a product and point image_url at the
 * served endpoint (with a cache-busting timestamp so the UI refreshes).
 */
export async function saveProductImage(
  storeId: string,
  id: string,
  data: Buffer,
  mime: string,
): Promise<Product> {
  await getProductById(storeId, id); // ensures product exists in this store

  await sql`
    INSERT INTO product_images (product_id, data, mime, byte_size, updated_at)
    VALUES (${id}, ${data}, ${mime}, ${data.length}, now())
    ON CONFLICT (product_id)
    DO UPDATE SET data = EXCLUDED.data, mime = EXCLUDED.mime, byte_size = EXCLUDED.byte_size, updated_at = now()
  `;

  const url = `/media/products/${id}/image?t=${Date.now()}`;
  const rows = await sql<Product[]>`
    UPDATE products SET image_url = ${url}, updated_at = now()
    WHERE id = ${id} AND store_id = ${storeId}
    RETURNING *
  `;
  return rows[0]!;
}

/** Read a product's stored image (public serve — looked up by id only). */
export async function getProductImage(id: string): Promise<{ data: Buffer; mime: string } | null> {
  const rows = await sql<{ data: Buffer; mime: string }[]>`
    SELECT data, mime FROM product_images WHERE product_id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Soft-delete: deactivate instead of removing the row. `order_items` keeps a
 * foreign key to `products`, so a hard delete would fail (and destroy history)
 * once the product has ever been sold. Deactivated products disappear from the
 * cashier grid but remain referenceable from past orders.
 */
export async function deleteProduct(storeId: string, id: string): Promise<void> {
  const rows = await sql<{ id: string }[]>`
    UPDATE products SET is_active = false, updated_at = now()
    WHERE id = ${id} AND store_id = ${storeId} AND is_active = true
    RETURNING id
  `;
  if (rows.length === 0) {
    // Either never existed, or already inactive (idempotent delete).
    const exists = await sql<{ id: string }[]>`
      SELECT id FROM products WHERE id = ${id} AND store_id = ${storeId} LIMIT 1
    `;
    if (exists.length === 0) throw new NotFoundError('Product not found');
  }
}
