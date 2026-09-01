import { Hono } from 'hono';
import type { Context } from 'hono';
import { listAuditLogsQuerySchema } from '@simplepos/shared';
import type { AppEnv } from '../types.js';
import { parseQuery } from '../middleware/validate.js';
import { requireOwner } from '../middleware/rbac.js';
import { ValidationError } from '../utils/errors.js';
import * as auditService from '../services/audit-log.service.js';

// Audit trail viewer — owner only.
export const auditLogRoutes = new Hono<AppEnv>();
auditLogRoutes.use('*', requireOwner);

function storeIdOf(c: Context<AppEnv>): string {
  const storeId = c.get('user').store_id;
  if (!storeId) throw new ValidationError('User is not assigned to a store', { fields: [] });
  return storeId;
}

// GET /api/audit-logs
auditLogRoutes.get('/', async (c) => {
  const query = parseQuery(c, listAuditLogsQuerySchema);
  const result = await auditService.listAuditLogs(storeIdOf(c), query);
  return c.json(result, 200);
});
