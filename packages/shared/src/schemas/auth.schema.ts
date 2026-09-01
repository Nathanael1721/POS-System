import { z } from 'zod';

/**
 * Login request body — POST /api/auth/login
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'Password is required').max(255),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Refresh request body — POST /api/auth/refresh
 */
export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token is required'),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

/**
 * Roles supported by the system.
 */
export const roleSchema = z.enum(['owner', 'cashier']);
export type Role = z.infer<typeof roleSchema>;
