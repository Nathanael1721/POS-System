import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as Sentry from '@sentry/node';
import type { AppEnv } from '../types.js';
import { isAppError, ValidationError } from '../utils/errors.js';
import { isProduction } from '../config/env.js';
import { logger } from '../config/logger.js';

interface FieldError {
  field: string;
  message: string;
}

function extractFields(details: unknown): FieldError[] | null {
  if (details && typeof details === 'object' && 'fields' in details) {
    const fields = (details as { fields: unknown }).fields;
    if (Array.isArray(fields)) return fields as FieldError[];
  }
  return null;
}

/**
 * Global error handler producing the contract response shapes:
 *  - Validation: `{ error, code, fields }` with 422
 *  - Other AppError: `{ error, code, details? }` with its status
 *  - Unknown: `{ error, code }` with 500, never leaking stack traces in prod.
 */
export function onError(err: Error, c: Context<AppEnv>): Response {
  const requestId = c.get('requestId');

  if (err instanceof ValidationError) {
    const fields = extractFields(err.details) ?? [];
    return c.json({ error: err.message, code: err.code, fields }, 422);
  }

  if (isAppError(err)) {
    logger.warn({ request_id: requestId, code: err.code, msg: err.message }, 'handled app error');
    const body: Record<string, unknown> = { error: err.message, code: err.code };
    if (err.details !== undefined) body.details = err.details;
    return c.json(body, err.status as never);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: err.message, code: 'HTTP_EXCEPTION' }, err.status);
  }

  // Unknown / unexpected error — log full detail, report, return opaque 500.
  logger.error({ request_id: requestId, err }, 'unhandled error');
  Sentry.captureException(err);

  return c.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(isProduction ? {} : { details: { message: err.message } }),
    },
    500,
  );
}

export function notFound(c: Context<AppEnv>): Response {
  return c.json({ error: 'Resource not found', code: 'NOT_FOUND' }, 404);
}
