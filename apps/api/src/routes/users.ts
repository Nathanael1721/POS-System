import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import {
  createUserSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '@simplepos/shared';
import type { AppEnv } from '../types.js';
import { parseBody } from '../middleware/validate.js';
import { requireOwner } from '../middleware/rbac.js';
import { clientIp, recordAudit } from '../middleware/audit.js';
import { ValidationError } from '../utils/errors.js';
import * as userService from '../services/user.service.js';
import * as authService from '../services/auth.service.js';

export const userRoutes = new Hono<AppEnv>();

const idParam = z.string().uuid('Invalid user id');

function storeIdOf(c: Context<AppEnv>): string {
  const storeId = c.get('user').store_id;
  if (!storeId) throw new ValidationError('User is not assigned to a store', { fields: [] });
  return storeId;
}

// PATCH /api/users/me  — update own display name
userRoutes.patch('/me', async (c) => {
  const body = await parseBody(c, updateProfileSchema);
  const user = c.get('user');
  const updated = await userService.updateProfile(user.id, body);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'user.update_profile',
    payload: { name: body.name },
    ip: clientIp(c),
  });
  return c.json({ user: updated }, 200);
});

// POST /api/users/me/password  — change own password
userRoutes.post('/me/password', async (c) => {
  const body = await parseBody(c, changePasswordSchema);
  const user = c.get('user');
  await userService.changePassword(user.id, body);
  // Revoke existing refresh tokens after a password change.
  await authService.logout(user.id);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'user.change_password',
    payload: {},
    ip: clientIp(c),
  });
  return c.body(null, 204);
});

// GET /api/users  — owner: list staff in store
userRoutes.get('/', requireOwner, async (c) => {
  const users = await userService.listUsers(storeIdOf(c));
  return c.json({ data: users }, 200);
});

// POST /api/users  — owner: create a new cashier (or owner)
userRoutes.post('/', requireOwner, async (c) => {
  const body = await parseBody(c, createUserSchema);
  const actor = c.get('user');
  const created = await userService.createUser(storeIdOf(c), body);
  await recordAudit({
    userId: actor.id,
    storeId: actor.store_id,
    action: 'user.create',
    payload: { id: created.id, email: created.email, role: created.role },
    ip: clientIp(c),
  });
  return c.json(created, 201);
});

// DELETE /api/users/:id  — owner: deactivate a staff user
userRoutes.delete('/:id', requireOwner, async (c) => {
  const id = idParam.parse(c.req.param('id'));
  const actor = c.get('user');
  await userService.deactivateUser(storeIdOf(c), id, actor.id);
  await recordAudit({
    userId: actor.id,
    storeId: actor.store_id,
    action: 'user.deactivate',
    payload: { id },
    ip: clientIp(c),
  });
  return c.body(null, 204);
});
