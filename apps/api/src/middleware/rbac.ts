import type { MiddlewareHandler } from 'hono';
import type { Role } from '@simplepos/shared';
import type { AppEnv } from '../types.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Role-based access control middleware factory.
 * Must be mounted after `authMiddleware`.
 *
 *   app.use('/api/reports/*', authMiddleware, requireRole('owner'))
 */
export function requireRole(...allowed: Role[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || !allowed.includes(user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }
    await next();
  };
}

export const requireOwner = requireRole('owner');
