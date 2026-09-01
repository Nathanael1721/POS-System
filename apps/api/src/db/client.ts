import postgres from 'postgres';
import { env, isProduction } from '../config/env.js';

/**
 * Single shared postgres.js connection pool.
 *
 * Deployment compatibility:
 * - **Supabase**: use the connection POOLER URL (port 6543, transaction mode)
 *   from serverless hosts — Vercel functions have no IPv6 route to the direct
 *   database endpoint. Transaction-mode pooling goes through PgBouncer, which
 *   does not support session-level prepared statements, so `prepare: false` is
 *   mandatory there ("prepared statement does not exist" errors otherwise).
 * - **SSL** is enabled automatically for any non-local host (Supabase, Upstash
 *   style managed DBs) and disabled for localhost/docker postgres.
 *
 * Use tagged-template queries everywhere — postgres.js parameterizes all
 * interpolated values automatically, so there is no string interpolation of
 * user input into SQL.
 */
const dbUrl = new URL(env.DATABASE_URL);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);
const isLocalDb = LOCAL_HOSTS.has(dbUrl.hostname);
// Supabase transaction pooler (port 6543) — see comment above.
const isTransactionPooler = dbUrl.port === '6543';

export const sql = postgres(env.DATABASE_URL, {
  // Serverless instances multiply — keep per-instance pools small.
  max: isProduction ? 5 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: isLocalDb ? undefined : 'require',
  prepare: !isTransactionPooler,
  // DECIMAL/NUMERIC are returned as strings to preserve precision.
  types: {},
  onnotice: () => {
    /* suppress NOTICE noise */
  },
});

export type Sql = typeof sql;

/**
 * Transaction helper. Rolls back automatically if the callback throws.
 */
export async function withTransaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T> {
  return sql.begin((tx) => fn(tx as unknown as Sql)) as Promise<T>;
}

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}
