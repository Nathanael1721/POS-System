import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.js';
import { redis } from '../db/redis.js';
import { clientIp } from './audit.js';
import { RateLimitError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

type KeyFn = (c: Parameters<MiddlewareHandler<AppEnv>>[0]) => string;

interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
  /** Logical bucket name (keeps different limiters from colliding). */
  bucket: string;
  /** Derive the per-caller key (IP, user id, ...). */
  key: KeyFn;
}

/**
 * Fixed-window rate limiter backed by Redis INCR + EXPIRE.
 * Fails open (allows the request) if Redis is unavailable, logging the error,
 * so a Redis outage never takes down the whole API.
 */
function rateLimit(opts: RateLimitOptions): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const redisKey = `ratelimit:${opts.bucket}:${opts.key(c)}`;
    try {
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, opts.windowSec);
      } else if ((await redis.ttl(redisKey)) === -1) {
        // Safety net: if the EXPIRE after INCR was missed (crash between the
        // two calls), the counter would persist forever and lock the caller
        // out permanently. Restore the window instead.
        await redis.expire(redisKey, opts.windowSec);
      }
      if (count > opts.limit) {
        const ttl = await redis.ttl(redisKey);
        c.header('Retry-After', String(ttl > 0 ? ttl : opts.windowSec));
        throw new RateLimitError('Too many requests, please slow down', {
          limit: opts.limit,
          window_seconds: opts.windowSec,
        });
      }
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      logger.error({ err, bucket: opts.bucket }, 'rate limiter unavailable, failing open');
    }
    await next();
  };
}

/** Login limiter: 5 requests / 15 minutes per IP. */
export const loginRateLimit = rateLimit({
  bucket: 'login',
  limit: 5,
  windowSec: 15 * 60,
  key: (c) => clientIp(c) ?? 'unknown',
});

/** Global limiter: 100 requests / minute per authenticated user (or IP). */
export const userRateLimit = rateLimit({
  bucket: 'user',
  limit: 100,
  windowSec: 60,
  key: (c) => c.get('user')?.id ?? clientIp(c) ?? 'unknown',
});
