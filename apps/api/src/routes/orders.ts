import { Hono } from 'hono';
import { z } from 'zod';
import { createOrderSchema, listOrdersQuerySchema, voidOrderSchema } from '@simplepos/shared';
import type { AppEnv } from '../types.js';
import { parseBody, parseQuery } from '../middleware/validate.js';
import { clientIp } from '../middleware/audit.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { sql } from '../db/client.js';
import * as orderService from '../services/order.service.js';

export const orderRoutes = new Hono<AppEnv>();

const idParam = z.string().uuid('Invalid order id');

async function storeNameOf(storeId: string): Promise<string> {
  const rows = await sql<{ name: string }[]>`SELECT name FROM stores WHERE id = ${storeId} LIMIT 1`;
  if (!rows[0]) throw new NotFoundError('Store not found');
  return rows[0].name;
}

// POST /api/orders  — owner or cashier (both process orders)
orderRoutes.post('/', async (c) => {
  const body = await parseBody(c, createOrderSchema);
  const user = c.get('user');
  if (!user.store_id) throw new ValidationError('User is not assigned to a store', { fields: [] });

  const storeName = await storeNameOf(user.store_id);
  const result = await orderService.createOrder(user, body, {
    ip: clientIp(c),
    storeName,
  });
  return c.json(result, 201);
});

// GET /api/orders  — cashier sees own; owner sees all
orderRoutes.get('/', async (c) => {
  const query = parseQuery(c, listOrdersQuerySchema);
  const result = await orderService.listOrders(c.get('user'), query);
  return c.json(result, 200);
});

// GET /api/orders/:id
orderRoutes.get('/:id', async (c) => {
  const id = idParam.parse(c.req.param('id'));
  const result = await orderService.getOrderById(c.get('user'), id);
  return c.json(result, 200);
});

// POST /api/orders/:id/void — cancel a paid order, restore stock, audit it.
// Owner may void any order; a cashier only their own (enforced in the service).
orderRoutes.post('/:id/void', async (c) => {
  const id = idParam.parse(c.req.param('id'));
  const body = await parseBody(c, voidOrderSchema);
  const user = c.get('user');
  const order = await orderService.voidOrder(user, id, body.reason, { ip: clientIp(c) });
  return c.json(order, 200);
});
