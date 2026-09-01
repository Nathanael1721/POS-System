import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import type { LoginInput, PublicUser, AuthTokens } from '@simplepos/shared';
import { sql } from '../db/client.js';
import { redis } from '../db/redis.js';
import { AuthError } from '../utils/errors.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_TTL_SECONDS,
} from '../utils/jwt.js';

const BCRYPT_COST = 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function refreshKey(userId: string, tokenHash: string): string {
  return `refresh:${userId}:${tokenHash}`;
}

function toPublicUser(row: PublicUser & { password_hash?: string }): PublicUser {
  const { password_hash: _omit, ...rest } = row as PublicUser & { password_hash?: string };
  return rest;
}

/** Hash a plaintext password with bcrypt (cost 12). Exposed for seeding/tests. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

interface UserRow extends PublicUser {
  password_hash: string;
}

/**
 * Authenticate by email + password. On success, issue an access token and a
 * refresh token (the refresh token's hash is stored in Redis for rotation).
 */
export async function login(input: LoginInput): Promise<AuthTokens> {
  const rows = await sql<UserRow[]>`
    SELECT id, store_id, name, email, password_hash, role, is_active, created_at, updated_at
    FROM users
    WHERE email = ${input.email}
    LIMIT 1
  `;
  const user = rows[0];

  // Always run a bcrypt comparison to avoid leaking which emails exist via timing.
  const hash = user?.password_hash ?? '$2a$12$0000000000000000000000000000000000000000000000000000a';
  const ok = await bcrypt.compare(input.password, hash);

  if (!user || !ok) {
    throw new AuthError('Invalid email or password');
  }
  if (!user.is_active) {
    throw new AuthError('Account is disabled');
  }

  const tokens = await issueTokens({
    userId: user.id,
    storeId: user.store_id,
    role: user.role,
  });

  return { ...tokens, user: toPublicUser(user) };
}

async function issueTokens(input: {
  userId: string;
  storeId: string | null;
  role: 'owner' | 'cashier';
}): Promise<{ access_token: string; refresh_token: string }> {
  const jti = randomUUID();
  const access_token = await signAccessToken(input);
  const refresh_token = await signRefreshToken({ userId: input.userId, jti });

  await redis.set(
    refreshKey(input.userId, hashToken(refresh_token)),
    JSON.stringify({ jti, store_id: input.storeId, role: input.role }),
    'EX',
    REFRESH_TTL_SECONDS,
  );

  return { access_token, refresh_token };
}

/**
 * Rotate a refresh token: verify the token exists in Redis, revoke it, and
 * issue a fresh access + refresh token pair.
 */
export async function refresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  const payload = await verifyRefreshToken(refreshToken);
  const key = refreshKey(payload.sub, hashToken(refreshToken));

  const stored = await redis.get(key);
  if (!stored) {
    throw new AuthError('Refresh token has been revoked or expired');
  }

  // Load current user to re-derive store/role (they may have changed).
  const rows = await sql<
    { id: string; store_id: string | null; role: 'owner' | 'cashier'; is_active: boolean }[]
  >`
    SELECT id, store_id, role, is_active FROM users WHERE id = ${payload.sub} LIMIT 1
  `;
  const user = rows[0];
  if (!user || !user.is_active) {
    await redis.del(key);
    throw new AuthError('User no longer active');
  }

  // Rotate: delete the old token before issuing a new one.
  await redis.del(key);
  return issueTokens({ userId: user.id, storeId: user.store_id, role: user.role });
}

/** Revoke every refresh token for a user (logout). */
export async function logout(userId: string): Promise<void> {
  const pattern = refreshKey(userId, '*');
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/** Fetch the current user as a public (password-free) object. */
export async function getUserById(userId: string): Promise<PublicUser> {
  const rows = await sql<UserRow[]>`
    SELECT id, store_id, name, email, role, is_active, created_at, updated_at
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  const user = rows[0];
  if (!user) throw new AuthError('User not found');
  return toPublicUser(user);
}
