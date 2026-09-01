import { z } from 'zod';

const cashSchema = z
  .number()
  .nonnegative('Cash amount cannot be negative')
  .max(9_999_999_999_999.99, 'Amount exceeds maximum allowed value')
  .refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
    message: 'Amount may have at most 2 decimal places',
  });

/** Open a shift with a starting cash float — POST /api/shifts/open */
export const openShiftSchema = z.object({
  opening_cash: cashSchema.default(0),
});
export type OpenShiftInput = z.infer<typeof openShiftSchema>;

/** Close a shift with the physical cash count — POST /api/shifts/close */
export const closeShiftSchema = z.object({
  counted_cash: cashSchema,
  notes: z.string().trim().max(500).nullable().optional(),
});
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;

/** Record a petty-cash movement during a shift — POST /api/shifts/cash-movement */
export const cashMovementSchema = z.object({
  type: z.enum(['in', 'out']),
  amount: cashSchema.refine((n) => n > 0, 'Amount must be greater than zero'),
  reason: z.string().trim().max(255).nullable().optional(),
});
export type CashMovementInput = z.infer<typeof cashMovementSchema>;

/** Query params — GET /api/shifts */
export const listShiftsQuerySchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>;
