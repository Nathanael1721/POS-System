import { SignJWT, jwtVerify } from 'jose';
import type { JwtAccessPayload, JwtRefreshPayload, Role } from '@simplepos/shared';
import { env } from '../config/env.js';
import { AuthError } from './errors.js';

const accessKey = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
const refreshKey = new TextEncoder().encode(env.REFRESH_TOKEN_SECRET);

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const ISSUER = 'simplepos';

export async function signAccessToken(input: {
  userId: string;
  storeId: string | null;
  role: Role;
}): Promise<string> {
  return new SignJWT({ store_id: input.storeId, role: input.role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(accessKey);
}

export async function signRefreshToken(input: { userId: string; jti: string }): Promise<string> {
  return new SignJWT({ type: 'refresh', jti: input.jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(refreshKey);
}

export async function verifyAccessToken(token: string): Promise<JwtAccessPayload> {
  try {
    const { payload } = await jwtVerify(token, accessKey, { issuer: ISSUER });
    if (payload.type !== 'access' || typeof payload.sub !== 'string') {
      throw new AuthError('Invalid access token');
    }
    return {
      sub: payload.sub,
      store_id: (payload.store_id as string | null) ?? null,
      role: payload.role as Role,
      type: 'access',
    };
  } catch {
    throw new AuthError('Invalid or expired access token');
  }
}

export async function verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
  try {
    const { payload } = await jwtVerify(token, refreshKey, { issuer: ISSUER });
    if (payload.type !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.jti !== 'string') {
      throw new AuthError('Invalid refresh token');
    }
    return { sub: payload.sub, type: 'refresh', jti: payload.jti };
  } catch {
    throw new AuthError('Invalid or expired refresh token');
  }
}

/** Seconds until the access token expires — useful for clients. */
export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
