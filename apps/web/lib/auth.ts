'use client';

import type { PublicUser, AuthTokens } from '@simplepos/shared';

const ACCESS_KEY = 'simplepos.access_token';
const REFRESH_KEY = 'simplepos.refresh_token';
const USER_KEY = 'simplepos.user';

/** Minimal browser token storage. Access token is short-lived (15m). */
export const tokenStore = {
  getAccess(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  getUser(): PublicUser | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  },
  setSession(tokens: AuthTokens): void {
    window.localStorage.setItem(ACCESS_KEY, tokens.access_token);
    window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(tokens.user));
  },
  setAccess(token: string): void {
    window.localStorage.setItem(ACCESS_KEY, token);
  },
  setUser(user: PublicUser): void {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};

interface JwtBody {
  sub: string;
  role: string;
  store_id: string | null;
  exp: number;
}

/** Decode a JWT payload (no verification — display purposes only). */
export function decodeJwt(token: string): JwtBody | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtBody;
  } catch {
    return null;
  }
}

export function isAccessExpired(token: string | null): boolean {
  if (!token) return true;
  const body = decodeJwt(token);
  if (!body) return true;
  // Treat as expired 10s early to avoid edge races.
  return body.exp * 1000 < Date.now() + 10_000;
}
