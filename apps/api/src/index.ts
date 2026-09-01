import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import * as Sentry from '@sentry/node';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import type { AppEnv } from './types.js';

import { requestLogger } from './middleware/request-logger.js';
import { authMiddleware } from './middleware/auth.js';
import { userRateLimit } from './middleware/rate-limit.js';
import { onError, notFound } from './middleware/error-handler.js';

import { authRoutes } from './routes/auth.js';
import { productRoutes } from './routes/products.js';
import { categoryRoutes } from './routes/categories.js';
import { orderRoutes } from './routes/orders.js';
import { reportRoutes } from './routes/reports.js';
import { userRoutes } from './routes/users.js';
import { shiftRoutes } from './routes/shifts.js';
import { storeRoutes } from './routes/store.js';
import { mediaRoutes } from './routes/media.js';
import { auditLogRoutes } from './routes/audit-logs.js';

import { closeDb, sql } from './db/client.js';
import { closeRedis, redis } from './db/redis.js';

// --- Observability: Sentry init (stub; configured via SENTRY_DSN) ---
if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0.1 });
  logger.info('Sentry initialized');
}

const app = new Hono<AppEnv>();

// --- Global middleware ---
app.use('*', secureHeaders());
app.use('*', requestLogger);
app.use(
  '*',
  cors({
    origin: env.FRONTEND_URL,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }),
);

// --- Health checks (unauthenticated) ---
app.get('/health', (c) => c.json({ status: 'ok', service: 'simplepos-api' }));
app.get('/health/ready', async (c) => {
  try {
    await sql`SELECT 1`;
    await redis.ping();
    return c.json({ status: 'ready' });
  } catch (err) {
    logger.error({ err }, 'readiness check failed');
    return c.json({ status: 'not_ready' }, 503);
  }
});

// --- Public media (product images, no auth so <img> can load them) ---
app.route('/media', mediaRoutes);

// --- Auth routes (login is public + rate limited internally) ---
app.route('/api/auth', authRoutes);

// --- Protected API: require valid JWT + per-user rate limit ---
const api = new Hono<AppEnv>();
api.use('*', authMiddleware, userRateLimit);
api.route('/products', productRoutes);
api.route('/categories', categoryRoutes);
api.route('/orders', orderRoutes);
api.route('/reports', reportRoutes);
api.route('/users', userRoutes);
api.route('/shifts', shiftRoutes);
api.route('/store', storeRoutes);
api.route('/audit-logs', auditLogRoutes);
app.route('/api', api);

// --- Fallthrough + error handling ---
app.notFound(notFound);
app.onError(onError);

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port, env: env.NODE_ENV }, 'simplepos-api listening');
});

// --- Graceful shutdown ---
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down');
  server.close();
  await Promise.allSettled([closeDb(), closeRedis()]);
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export { app };
