import postgres from 'postgres';
import { env, isProduction } from '../config/env.js';

/**
 * Single shared postgres.js connection pool.
 *
 * Use tagged-template queries everywhere — postgres.js parameterizes all
 * interpolated values automatically, so there is no string interpolation of
 * user input into SQL.
 */
export const sql = postgres(env.DATABASE_URL, {
  max: isProduction ? 20 : 10,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: isProduction ? 'require' : undefined,
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
