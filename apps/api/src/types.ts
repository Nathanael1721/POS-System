import type { Role } from '@simplepos/shared';

/** Authenticated principal attached to the request context by auth middleware. */
export interface AuthUser {
  id: string;
  store_id: string | null;
  role: Role;
  name: string;
  email: string;
}

/** Hono context variable bindings used across the app. */
export interface AppVariables {
  user: AuthUser;
  requestId: string;
}

export type AppEnv = { Variables: AppVariables };
