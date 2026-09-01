import bcrypt from 'bcryptjs';
import type {
  CreateUserInput,
  UpdateProfileInput,
  ChangePasswordInput,
  PublicUser,
} from '@simplepos/shared';
import { sql } from '../db/client.js';
import { ConflictError, NotFoundError, AuthError, ValidationError } from '../utils/errors.js';

const BCRYPT_COST = 12;

interface UserRow extends PublicUser {
  password_hash: string;
}

function toPublic(row: UserRow): PublicUser {
  const { password_hash: _omit, ...rest } = row;
  return rest;
}

/** List staff users within a store (owner management view). */
export async function listUsers(storeId: string): Promise<PublicUser[]> {
  const rows = await sql<UserRow[]>`
    SELECT id, store_id, name, email, role, is_active, created_at, updated_at
    FROM users
    WHERE store_id = ${storeId}
    ORDER BY created_at ASC
  `;
  return rows.map(toPublic);
}

/**
 * Create a new staff user in the owner's store. Email must be globally unique.
 */
export async function createUser(storeId: string, input: CreateUserInput): Promise<PublicUser> {
  const existing = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${input.email} LIMIT 1`;
  if (existing.length > 0) {
    throw new ConflictError('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const rows = await sql<UserRow[]>`
    INSERT INTO users (store_id, name, email, password_hash, role, is_active)
    VALUES (${storeId}, ${input.name}, ${input.email}, ${passwordHash}, ${input.role}, true)
    RETURNING id, store_id, name, email, password_hash, role, is_active, created_at, updated_at
  `;
  return toPublic(rows[0]!);
}

/** Update the caller's own display name. */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  const rows = await sql<UserRow[]>`
    UPDATE users
    SET name = ${input.name}, updated_at = now()
    WHERE id = ${userId}
    RETURNING id, store_id, name, email, password_hash, role, is_active, created_at, updated_at
  `;
  if (rows.length === 0) throw new NotFoundError('User not found');
  return toPublic(rows[0]!);
}

/**
 * Change the caller's password after verifying the current one.
 */
export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const rows = await sql<{ password_hash: string }[]>`
    SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new NotFoundError('User not found');

  const ok = await bcrypt.compare(input.current_password, row.password_hash);
  if (!ok) throw new AuthError('Current password is incorrect');

  if (input.current_password === input.new_password) {
    throw new ValidationError('New password must differ from the current password', {
      fields: [{ field: 'new_password', message: 'Must differ from current password' }],
    });
  }

  const newHash = await bcrypt.hash(input.new_password, BCRYPT_COST);
  await sql`UPDATE users SET password_hash = ${newHash}, updated_at = now() WHERE id = ${userId}`;
}

/** Deactivate a staff user (owner only). Cannot deactivate yourself. */
export async function deactivateUser(storeId: string, targetId: string, actingUserId: string): Promise<void> {
  if (targetId === actingUserId) {
    throw new ValidationError('You cannot deactivate your own account', { fields: [] });
  }
  const rows = await sql<{ id: string }[]>`
    UPDATE users SET is_active = false, updated_at = now()
    WHERE id = ${targetId} AND store_id = ${storeId}
    RETURNING id
  `;
  if (rows.length === 0) throw new NotFoundError('User not found');
}
