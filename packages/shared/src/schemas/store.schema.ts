import { z } from 'zod';

/** Update store settings — PATCH /api/store (owner). */
export const updateStoreSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    address: z.string().trim().max(1000).nullable().optional(),
    shift_enabled: z.boolean().optional(),
    default_tax_percent: z.number().min(0).max(100).optional(),
    low_stock_threshold: z.number().int().min(0).max(100000).optional(),
    auto_print_receipt: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
