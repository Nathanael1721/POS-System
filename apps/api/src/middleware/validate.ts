import type { Context } from 'hono';
import type { z, ZodTypeAny } from 'zod';
import { ValidationError } from '../utils/errors.js';

/** Flatten Zod issues into the documented `{ field, message }[]` shape. */
function toFieldErrors(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Parse and validate the JSON request body against a Zod schema.
 * Throws ValidationError (422) with field-level errors on failure.
 */
export async function parseBody<S extends ZodTypeAny>(c: Context, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON', { fields: [] });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError('Validation failed', { fields: toFieldErrors(result.error) });
  }
  return result.data;
}

/** Parse and validate the query string against a Zod schema. */
export function parseQuery<S extends ZodTypeAny>(c: Context, schema: S): z.infer<S> {
  const result = schema.safeParse(c.req.query());
  if (!result.success) {
    throw new ValidationError('Validation failed', { fields: toFieldErrors(result.error) });
  }
  return result.data;
}
