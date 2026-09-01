import type { Context } from 'hono';
import type { Sql } from '../db/client.js';
import { sql as defaultSql } from '../db/client.js';
import type { AppEnv } from '../types.js';
import { logger } from '../config/logger.js';

/**
 * Extract the client IP from common proxy headers, falling back to the socket.
 * Truncated to fit audit_logs.ip_address VARCHAR(45) (IPv6 max length).
 */
export function clientIp(c: Context<AppEnv>): string | null {
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim().slice(0, 45);
  const real = c.req.header('x-real-ip');
  if (real) return real.trim().slice(0, 45);
  const info = c.env as { remoteAddress?: string } | undefined;
  return info?.remoteAddress ? info.remoteAddress.slice(0, 45) : null;
}

export interface AuditEntry {
  userId: string | null;
  storeId: string | null;
  action: string;
  payload: unknown;
  ip: string | null;
}

/**
 * Write a single audit_logs row. Pass a transaction (`tx`) to make the audit
 * write atomic with the state change it records (e.g. order confirmation);
 * otherwise it uses the shared connection.
 *
 * Audit writes never throw into the caller: a logging failure must not roll
 * back a successful business operation that already committed. When a `tx` is
 * supplied the caller owns transactional integrity and errors propagate.
 */
export async function recordAudit(entry: AuditEntry, tx?: Sql): Promise<void> {
  const db = tx ?? defaultSql;
  const run = db`
    INSERT INTO audit_logs (user_id, store_id, action, payload, ip_address)
    VALUES (
      ${entry.userId},
      ${entry.storeId},
      ${entry.action},
      ${db.json(entry.payload as never)},
      ${entry.ip}
    )
  `;

  if (tx) {
    await run;
    return;
  }

  try {
    await run;
  } catch (err) {
    logger.error({ err, action: entry.action }, 'failed to write audit log');
  }
}
