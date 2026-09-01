import { Hono } from 'hono';
import { loginSchema, refreshSchema } from '@simplepos/shared';
import type { AppEnv } from '../types.js';
import { parseBody } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/rate-limit.js';
import { clientIp, recordAudit } from '../middleware/audit.js';
import * as authService from '../services/auth.service.js';

export const authRoutes = new Hono<AppEnv>();

// POST /api/auth/login  — rate limited (5 / 15min / IP)
authRoutes.post('/login', loginRateLimit, async (c) => {
  const body = await parseBody(c, loginSchema);
  const result = await authService.login(body);

  await recordAudit({
    userId: result.user.id,
    storeId: result.user.store_id,
    action: 'auth.login',
    payload: { email: result.user.email },
    ip: clientIp(c),
  });

  return c.json(result, 200);
});

// POST /api/auth/refresh
authRoutes.post('/refresh', async (c) => {
  const body = await parseBody(c, refreshSchema);
  const tokens = await authService.refresh(body.refresh_token);
  return c.json(tokens, 200);
});

// POST /api/auth/logout  (requires auth)
authRoutes.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');
  await authService.logout(user.id);
  await recordAudit({
    userId: user.id,
    storeId: user.store_id,
    action: 'auth.logout',
    payload: {},
    ip: clientIp(c),
  });
  return c.body(null, 200);
});

// GET /api/auth/me  (requires auth)
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const full = await authService.getUserById(user.id);
  return c.json({ user: full }, 200);
});
