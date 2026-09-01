import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Shared Redis client used for refresh-token storage and rate limiting.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  logger.error({ err }, 'redis error');
});

redis.on('connect', () => {
  logger.debug('redis connected');
});

export async function closeRedis(): Promise<void> {
  await redis.quit().catch(() => undefined);
}
