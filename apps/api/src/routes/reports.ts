import { Hono } from 'hono';
import type { Context } from 'hono';
import { reportSummaryQuerySchema, topProductsQuerySchema } from '@simplepos/shared';
import type { AppEnv } from '../types.js';
import { parseQuery } from '../middleware/validate.js';
import { requireOwner } from '../middleware/rbac.js';
import { ValidationError } from '../utils/errors.js';
import * as reportService from '../services/report.service.js';

// All report routes are owner-only (RBAC: cashier cannot access /api/reports/*).
export const reportRoutes = new Hono<AppEnv>();
reportRoutes.use('*', requireOwner);

function storeIdOf(c: Context<AppEnv>): string {
  const storeId = c.get('user').store_id;
  if (!storeId) throw new ValidationError('User is not assigned to a store', { fields: [] });
  return storeId;
}

// GET /api/reports/summary
reportRoutes.get('/summary', async (c) => {
  const query = parseQuery(c, reportSummaryQuerySchema);
  const summary = await reportService.getSummary(storeIdOf(c), query);
  return c.json(summary, 200);
});

// GET /api/reports/top-products
reportRoutes.get('/top-products', async (c) => {
  const query = parseQuery(c, topProductsQuerySchema);
  const products = await reportService.getTopProducts(storeIdOf(c), query);
  return c.json(products, 200);
});

// GET /api/reports/trend — revenue/order buckets ending at the current window.
reportRoutes.get('/trend', async (c) => {
  const query = parseQuery(c, reportSummaryQuerySchema);
  const trend = await reportService.getTrend(storeIdOf(c), query.period);
  return c.json(trend, 200);
});

// GET /api/reports/export — CSV download of all orders in the window.
reportRoutes.get('/export', async (c) => {
  const query = parseQuery(c, reportSummaryQuerySchema);
  const csv = await reportService.getOrdersCsv(storeIdOf(c), query);
  const filename = `laporan-${query.period}-${query.date ?? new Date().toISOString().slice(0, 10)}.csv`;
  return c.text(csv, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
});
