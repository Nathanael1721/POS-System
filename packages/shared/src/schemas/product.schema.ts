import { z } from 'zod';

/**
 * Money value — non-negative, max 2 decimal places, fits DECIMAL(15,2).
 */
const moneySchema = z
  .number()
  .nonnegative('Price cannot be negative')
  .max(9_999_999_999_999.99, 'Price exceeds maximum allowed value')
  .refine((n) => Number.isFinite(n) && Math.round(n * 100) === n * 100, {
    message: 'Price may have at most 2 decimal places',
  });

/**
 * Create product body — POST /api/products
 */
export const createProductSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, 'Name is required').max(255),
  sku: z.string().trim().max(100).nullable().optional(),
  barcode: z
    .string()
    .trim()
    .max(100)
    .regex(/^[A-Za-z0-9\-._]+$/, 'Barcode may only contain letters, numbers, and - . _')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  price: moneySchema,
  stock: z.number().int('Stock must be a whole number').nonnegative().default(0),
  image_url: z
    .string()
    .trim()
    .url('image_url must be a valid URL')
    .max(2048)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  is_active: z.boolean().default(true),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Update product body — PATCH /api/products/:id (partial)
 */
export const updateProductSchema = createProductSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' },
);
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Query params — GET /api/products
 */
export const listProductsQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  search: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
