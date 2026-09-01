import { z } from 'zod';

/** Query params — GET /api/audit-logs (owner only). */
export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  /** Substring match on the action string (e.g. "order", "product.delete"). */
  action: z.string().trim().max(100).optional(),
  user_id: z.string().uuid().optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
