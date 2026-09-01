import { serve } from '@hono/node-server';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { app } from './app.js';
import { closeDb } from './db/client.js';
import { closeRedis } from './db/redis.js';

/**
 * Local / Docker / Fly entrypoint: long-lived Node server.
 * (Serverless hosts use api/index.ts instead — never this file.)
 */
const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port, env: env.NODE_ENV }, 'simple-pos-api listening');
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
