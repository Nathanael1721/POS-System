import { handle } from 'hono/vercel';

import { app } from '../src/app.js';

/**
 * Vercel serverless entrypoint. Paired with vercel.json, every path is
 * rewritten to this function and matched by the Hono router (paths are defined
 * app-wide: /api/*, /health, /media/*).
 *
 * Required env vars (set them in the Vercel project):
 * DATABASE_URL (Supabase pooler URL), REDIS_URL (Upstash rediss://),
 * ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, FRONTEND_URL, NODE_ENV=production.
 */
export default handle(app);
