import type { AuditLogWithUser, ListAuditLogsQuery, Paginated } from '@simplepos/shared';
import { sql } from '../db/client.js';

/**
 * Paginated audit trail for a store (owner-only viewer). Optional substring
 * filter on the action and an exact user filter.
 */
export async function listAuditLogs(
  storeId: string,
  query: ListAuditLogsQuery,
): Promise<Paginated<AuditLogWithUser>> {
  const offset = (query.page - 1) * query.limit;
  const actionFilter = query.action ? `%${query.action}%` : null;

  const rows = await sql<Array<AuditLogWithUser & { total_count: string }>>`
    SELECT a.id, a.user_id, a.store_id, a.action, a.payload, a.ip_address, a.created_at,
           u.name AS user_name,
           COUNT(*) OVER()::text AS total_count
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.store_id = ${storeId}
      AND (${actionFilter}::text IS NULL OR a.action ILIKE ${actionFilter})
      AND (${query.user_id ?? null}::uuid IS NULL OR a.user_id = ${query.user_id ?? null})
    ORDER BY a.created_at DESC
    LIMIT ${query.limit}
    OFFSET ${offset}
  `;

  const total = rows.length > 0 ? Number(rows[0]!.total_count) : 0;
  const data = rows.map(({ total_count: _t, ...log }) => log as AuditLogWithUser);

  return {
    data,
    page: query.page,
    limit: query.limit,
    total,
    total_pages: Math.ceil(total / query.limit),
  };
}
