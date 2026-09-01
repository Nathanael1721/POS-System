/**
 * Typed application errors. Each carries an HTTP status and a stable machine
 * code so the global error handler can produce consistent
 * `{ error, code, details? }` responses.
 */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  readonly status = 422;
  readonly code = 'VALIDATION_ERROR';
}

export class AuthError extends AppError {
  readonly status = 401;
  readonly code = 'AUTH_ERROR';
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = 'FORBIDDEN';
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = 'CONFLICT';
}

export class RateLimitError extends AppError {
  readonly status = 429;
  readonly code = 'RATE_LIMITED';
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
