/**
 * API Error Handling
 * Standardized error classes and response formatting
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Error details can be various shapes depending on the error type
 */
export type ErrorDetails = Record<string, unknown> | unknown[] | string | undefined;

/**
 * Interface for database errors with PostgreSQL error codes
 */
interface DatabaseError extends Error {
  code: string;
  constraint?: string;
  column?: string;
}

/**
 * Interface for Zod validation errors
 */
interface ZodValidationError extends Error {
  name: 'ZodError';
  issues: unknown[];
}

/**
 * Type guard for database errors
 */
function isDatabaseError(error: unknown): error is DatabaseError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as DatabaseError).code === 'string'
  );
}

/**
 * Type guard for Zod errors
 */
function isZodError(error: unknown): error is ZodValidationError {
  return error instanceof Error && error.name === 'ZodError' && 'issues' in error;
}

/**
 * Formatted error response structure
 */
interface ErrorResponse {
  error: string;
  code?: string;
  details?: ErrorDetails;
  stack?: string;
}

/**
 * Base API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public code?: string,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request', details?: ErrorDetails) {
    super(400, message, 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', details?: ErrorDetails) {
    super(401, message, 'UNAUTHORIZED', details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', details?: ErrorDetails) {
    super(403, message, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', details?: ErrorDetails) {
    super(404, `${resource} not found`, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', details?: ErrorDetails) {
    super(409, message, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: ErrorDetails) {
    super(422, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: ErrorDetails) {
    super(500, message, 'INTERNAL_ERROR', details);
    this.name = 'InternalServerError';
  }
}

/**
 * Service Unavailable Error (503)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable', details?: ErrorDetails) {
    super(503, message, 'SERVICE_UNAVAILABLE', details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Format error response
 */
export function formatErrorResponse(error: ApiError): ErrorResponse {
  const response: ErrorResponse = {
    error: error.message,
    code: error.code,
  };

  // Include details in development mode
  if (process.env.NODE_ENV === 'development' && error.details) {
    response.details = error.details;
  }

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

/**
 * Handle API errors and return appropriate NextResponse
 */
export function handleApiError(error: unknown): NextResponse {
  logger.error('API Error', { error });

  // Handle known API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error.statusCode }
    );
  }

  // Handle database errors
  if (isDatabaseError(error)) {
    // Unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        formatErrorResponse(
          new ConflictError('Resource already exists', {
            constraint: error.constraint,
          })
        ),
        { status: 409 }
      );
    }

    // Foreign key violation
    if (error.code === '23503') {
      return NextResponse.json(
        formatErrorResponse(
          new BadRequestError('Referenced resource does not exist', {
            constraint: error.constraint,
          })
        ),
        { status: 400 }
      );
    }

    // Not null violation
    if (error.code === '23502') {
      return NextResponse.json(
        formatErrorResponse(
          new BadRequestError('Required field is missing', {
            column: error.column,
          })
        ),
        { status: 400 }
      );
    }

    // All other database errors (undefined column, undefined table, syntax errors, etc.)
    // Surface the actual DB error message — these are internal admin operations
    // and the real error is critical for diagnosing issues
    return NextResponse.json(
      formatErrorResponse(
        new InternalServerError(
          `Database error: ${error.message}`
        )
      ),
      { status: 500 }
    );
  }

  // Handle validation errors (Zod, etc.)
  if (isZodError(error)) {
    return NextResponse.json(
      formatErrorResponse(
        new ValidationError('Validation failed', error.issues)
      ),
      { status: 422 }
    );
  }

  // Handle generic errors — surface the actual error message for admin routes
  // since these are internal operations and the real error aids debugging
  if (error instanceof Error) {
    return NextResponse.json(
      formatErrorResponse(
        new InternalServerError(error.message)
      ),
      { status: 500 }
    );
  }

  // Unknown error
  return NextResponse.json(
    formatErrorResponse(
      new InternalServerError('An unexpected error occurred')
    ),
    { status: 500 }
  );
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

