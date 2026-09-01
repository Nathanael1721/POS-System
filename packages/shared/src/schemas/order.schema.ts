import { z } from 'zod';

export const paymentMethodSchema = z.enum(['cash', 'qris', 'card']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const orderStatusSchema = z.enum(['pending', 'paid', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/**
 * Single cart line — { product_id, quantity }
 */
export const orderItemInputSchema = z.object({
  product_id: z.string().uuid('product_id must be a valid UUID'),
  quantity: z.number().int('Quantity must be a whole number').positive('Quantity must be at least 1'),
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

/**
 * Create order body — POST /api/orders
 */
export const createOrderSchema = z
  .object({
    items: z.array(orderItemInputSchema).min(1, 'At least one item is required'),
    discount_percent: z.number().min(0).max(100).default(0),
    tax_percent: z.number().min(0).max(100).default(0),
    payment_method: paymentMethodSchema,
    amount_paid: z.number().nonnegative('amount_paid cannot be negative'),
    reference: z.string().trim().max(255).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Non-cash payments must carry a reference string.
    if (data.payment_method !== 'cash' && !data.reference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reference'],
        message: 'reference is required for non-cash payments',
      });
    }
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Query params — GET /api/orders
 */
export const listOrdersQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
  status: orderStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

/**
 * Reporting period granularity. The `date` query param acts as an anchor:
 * the window is resolved around it (day / ISO week / month / year containing it).
 */
export const reportPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

/**
 * Query params — GET /api/reports/summary
 */
export const reportSummaryQuerySchema = z.object({
  period: reportPeriodSchema.default('daily'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
});
export type ReportSummaryQuery = z.infer<typeof reportSummaryQuerySchema>;

/**
 * Query params — GET /api/reports/top-products
 */
export const topProductsQuerySchema = z.object({
  period: reportPeriodSchema.default('daily'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
  limit: z.coerce.number().int().positive().max(50).default(5),
});
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>;

/**
 * Body — POST /api/orders/:id/void
 * Cancels a paid order transactionally and restores stock.
 */
export const voidOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Alasan pembatalan minimal 3 karakter').max(500),
});
export type VoidOrderInput = z.infer<typeof voidOrderSchema>;

/**
 * Response — GET /api/reports/trend
 * Revenue/order buckets ending at the current period.
 */
export interface ReportTrendPoint {
  /** ISO timestamp of the bucket start (UTC). */
  bucket: string;
  revenue: string;
  orders: number;
}
