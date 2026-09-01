import { Hono } from 'hono';
import type { Context } from 'hono';
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from '@simplepos/shared';
import { z } from 'zod';
import type { AppEnv } from '../types.js';
import { parseBody, parseQuery } from '../middleware/validate.js';
import { requireOwner } from '../middleware/rbac.js';
import { clientIp, recordAudit } from '../middleware/audit.js';
import { ValidationError } from '../utils/errors.js';
import * as productService from '../services/product.service.js';

export const productRoutes = new Hono<AppEnv>();

const idParam = z.string().uuid('Invalid product id');

function storeIdOf(c: Context<AppEnv>): string {
  const storeId = c.get('user').store_id;
  if (!storeId) throw new ValidationError('User is not assigned to a store', { fields: [] });
  return storeId;
}

// GET /api/products  — any authenticated user
productRoutes.get('/', async (c) => {
  const query = parseQuery(c, listProductsQuerySchema);
  const result = await productService.listProducts(storeIdOf(c), query);
  return c.json(result, 200);
});

// GET /api/products/barcode/:code  — exact lookup for scan-to-add (any staff)
// Registered before /:id so the static "barcode" segment is not treated as an id.
productRoutes.get('/barcode/:code', async (c) => {
  const code = c.req.param('code').trim();
  if (!code) throw new ValidationError('Barcode is required', { fields: [] });
  const product = await productService.getProductByBarcode(storeIdOf(c), code);
  return c.json(product, 200);
});

// GET /api/products/:id
productRoutes.get('/:id', async (c) => {
  const id = idParam.parse(c.req.param('id'));
  const product = await productService.getProductById(storeIdOf(c), id);
  return c.json(product, 200);
});

// POST /api/products  — owner only
productRoutes.post('/', requireOwner, async (c) => {
  const body = await parseBody(c, createProductSchema);
  const user = c.get('user');
  const product = await productService.createProduct(storeIdOf(c), body);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'product.create',
    payload: product,
    ip: clientIp(c),
  });
  return c.json(product, 201);
});

// PATCH /api/products/:id  — owner only
productRoutes.patch('/:id', requireOwner, async (c) => {
  const id = idParam.parse(c.req.param('id'));
  const body = await parseBody(c, updateProductSchema);
  const user = c.get('user');
  const product = await productService.updateProduct(storeIdOf(c), id, body);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'product.update',
    payload: { id, changes: body },
    ip: clientIp(c),
  });
  return c.json(product, 200);
});

// POST /api/products/:id/image  — owner only, multipart upload (field "file")
productRoutes.post('/:id/image', requireOwner, async (c) => {
  const id = idParam.parse(c.req.param('id'));
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!(file instanceof File)) {
    throw new ValidationError('File gambar wajib diunggah pada field "file"', { fields: [] });
  }
  if (!productService.ALLOWED_IMAGE_MIMES.includes(file.type as never)) {
    throw new ValidationError(`Tipe gambar tidak didukung: ${file.type || 'unknown'}`, {
      fields: [{ field: 'file', message: 'Gunakan PNG, JPG, WEBP, atau GIF' }],
    });
  }
  const data = Buffer.from(await file.arrayBuffer());
  if (data.length === 0) throw new ValidationError('File kosong', { fields: [] });
  if (data.length > productService.MAX_IMAGE_BYTES) {
    throw new ValidationError('Ukuran gambar melebihi 2 MB', {
      fields: [{ field: 'file', message: 'Maksimal 2 MB' }],
    });
  }

  const user = c.get('user');
  const product = await productService.saveProductImage(storeIdOf(c), id, data, file.type);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'product.image_upload',
    payload: { id, mime: file.type, bytes: data.length },
    ip: clientIp(c),
  });
  return c.json(product, 200);
});

// DELETE /api/products/:id  — owner only
productRoutes.delete('/:id', requireOwner, async (c) => {
  const id = idParam.parse(c.req.param('id'));
  const user = c.get('user');
  await productService.deleteProduct(storeIdOf(c), id);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'product.delete',
    payload: { id },
    ip: clientIp(c),
  });
  return c.body(null, 204);
});
