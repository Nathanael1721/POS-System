import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types.js';
import * as productService from '../services/product.service.js';

/**
 * Public media routes — served WITHOUT auth so that <img src> tags (which
 * cannot send an Authorization header) can load product images directly.
 * Images are keyed by the product UUID (unguessable) and product photos are
 * not sensitive.
 */
export const mediaRoutes = new Hono<AppEnv>();

const idParam = z.string().uuid();

// GET /media/products/:id/image
mediaRoutes.get('/products/:id/image', async (c) => {
  const parsed = idParam.safeParse(c.req.param('id'));
  if (!parsed.success) return c.notFound();

  const image = await productService.getProductImage(parsed.data);
  if (!image) return c.notFound();

  c.header('Content-Type', image.mime);
  c.header('Cache-Control', 'public, max-age=60');
  return c.body(new Uint8Array(image.data), 200);
});
