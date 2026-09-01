import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

/**
 * Create a new staff user (cashier). Owner-only.
 */
export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: passwordSchema,
  role: z.enum(['owner', 'cashier']).default('cashier'),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Update the current user's own profile.
 */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Change the current user's password (requires the current password).
 */
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
