import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.js';
import { logger } from '../config/logger.js';

let counter = 0;

/** Lightweight monotonic request id (no external deps). */
function nextRequestId(): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `req_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/**
 * Structured request logging: emits `{ method, path, status, duration_ms,
 * user_id }` for every request, per the observability requirement.
 */
export const requestLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
  const requestId = nextRequestId();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  const start = performance.now();

  await next();

  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  logger.info({
    request_id: requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: durationMs,
    user_id: c.get('user')?.id ?? null,
  });
};
