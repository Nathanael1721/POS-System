import { Hono } from 'hono';
import type { Context } from 'hono';
import { updateStoreSchema } from '@simplepos/shared';
import type { AppEnv } from '../types.js';
import { parseBody } from '../middleware/validate.js';
import { requireOwner } from '../middleware/rbac.js';
import { clientIp, recordAudit } from '../middleware/audit.js';
import { ValidationError } from '../utils/errors.js';
import * as storeService from '../services/store.service.js';

export const storeRoutes = new Hono<AppEnv>();

function storeIdOf(c: Context<AppEnv>): string {
  const storeId = c.get('user').store_id;
  if (!storeId) throw new ValidationError('User is not assigned to a store', { fields: [] });
  return storeId;
}

// GET /api/store — any authenticated user (cashier needs shift_enabled flag)
storeRoutes.get('/', async (c) => {
  const store = await storeService.getStore(storeIdOf(c));
  return c.json(store, 200);
});

// PATCH /api/store — owner only (toggle shift, update profile)
storeRoutes.patch('/', requireOwner, async (c) => {
  const body = await parseBody(c, updateStoreSchema);
  const user = c.get('user');
  const store = await storeService.updateStore(storeIdOf(c), body);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'store.update',
    payload: body,
    ip: clientIp(c),
  });
  return c.json(store, 200);
});
