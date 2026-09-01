import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types.js';
import { parseBody } from '../middleware/validate.js';
import { requireOwner } from '../middleware/rbac.js';
import { clientIp, recordAudit } from '../middleware/audit.js';
import { ValidationError } from '../utils/errors.js';
import * as categoryService from '../services/category.service.js';

export const categoryRoutes = new Hono<AppEnv>();

const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  sort_order: z.number().int().default(0),
});

const idParam = z.string().uuid('Invalid category id');

function storeIdOf(c: Context<AppEnv>): string {
  const storeId = c.get('user').store_id;
  if (!storeId) throw new ValidationError('User is not assigned to a store', { fields: [] });
  return storeId;
}

// GET /api/categories  — any authenticated user
categoryRoutes.get('/', async (c) => {
  const categories = await categoryService.listCategories(storeIdOf(c));
  return c.json({ data: categories }, 200);
});

// POST /api/categories  — owner only
categoryRoutes.post('/', requireOwner, async (c) => {
  const body = await parseBody(c, createCategorySchema);
  const user = c.get('user');
  const category = await categoryService.createCategory(storeIdOf(c), body);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'category.create',
    payload: category,
    ip: clientIp(c),
  });
  return c.json(category, 201);
});

// DELETE /api/categories/:id  — owner only
categoryRoutes.delete('/:id', requireOwner, async (c) => {
  const id = idParam.parse(c.req.param('id'));
  const user = c.get('user');
  await categoryService.deleteCategory(storeIdOf(c), id);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'category.delete',
    payload: { id },
    ip: clientIp(c),
  });
  return c.body(null, 204);
});
