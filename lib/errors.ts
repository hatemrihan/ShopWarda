/**
 * Application error classes.
 * All domain errors extend AppError with a status code and error code.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, identifier?: string) {
    const msg = identifier
      ? `${entity} '${identifier}' not found`
      : `${entity} not found`;
    super(msg, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  public readonly details: Record<string, string[]>;

  constructor(message: string, details: Record<string, string[]> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}

/**
 * Convert an AppError to a JSON response payload.
 */
export function errorToResponse(error: AppError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error instanceof ValidationError && { details: error.details }),
    },
  };
}

/**
 * Handle unknown errors — wrap non-AppError as 500.
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const message =
    error instanceof Error ? error.message : 'Internal server error';
  return new AppError(message, 500, 'INTERNAL_ERROR', false);
}
