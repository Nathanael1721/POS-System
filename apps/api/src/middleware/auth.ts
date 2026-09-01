import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AuthError } from '../utils/errors.js';
import { sql } from '../db/client.js';

/**
 * Authentication middleware: verifies the Bearer access token, loads the user
 * and attaches it to the request context. Rejects inactive users.
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw new AuthError('Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = await verifyAccessToken(token);

  const rows = await sql<
    { id: string; store_id: string | null; role: 'owner' | 'cashier'; name: string; email: string; is_active: boolean }[]
  >`
    SELECT id, store_id, role, name, email, is_active
    FROM users
    WHERE id = ${payload.sub}
    LIMIT 1
  `;

  const user = rows[0];
  if (!user || !user.is_active) {
    throw new AuthError('User no longer active');
  }

  c.set('user', {
    id: user.id,
    store_id: user.store_id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  await next();
};
