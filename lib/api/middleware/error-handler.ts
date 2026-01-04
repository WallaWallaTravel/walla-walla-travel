import { logger } from '@/lib/logger';
/**
 * Enhanced Error Handling Middleware
 * 
 * Provides consistent error handling across all API routes with:
 * - Automatic error logging
 * - Type-safe error responses
 * - Monitoring integration ready
 * - Custom error classes
 */

import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/monitoring/error-logger';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * ServiceError - for backwards compatibility with old service layer
 * Used by: booking-service, proposal-service, customer-service, etc.
 */
export class ServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  /** Convert to ApiError for HTTP responses */
  toApiError(): ApiError {
    const statusMap: Record<string, number> = {
      'NOT_FOUND': 404,
      'VALIDATION_ERROR': 422,
      'CONFLICT': 409,
      'UNAUTHORIZED': 401,
      'FORBIDDEN': 403,
      'DATABASE_ERROR': 500,
    };
    return new ApiError(this.message, statusMap[this.code] || 500, this.code);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request', code?: string) {
    super(message, 400, code);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, 401, code);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', code?: string) {
    super(message, 403, code);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, 404, code);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', code?: string) {
    super(message, 409, code);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string = 'Validation failed',
    public errors?: Record<string, string[]>,
    code?: string
  ) {
    super(message, 422, code);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests', code?: string) {
    super(message, 429, code);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable', code?: string) {
    super(message, 503, code);
    this.name = 'ServiceUnavailableError';
  }
}

// ============================================================================
// Error Response Format
// ============================================================================

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    errors?: Record<string, string[]>;
  };
  timestamp: string;
  requestId?: string;
}

function formatErrorResponse(
  error: ApiError,
  requestId?: string
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      message: error.message,
      statusCode: error.statusCode,
    },
    timestamp: new Date().toISOString(),
  };

  if (error.code) {
    response.error.code = error.code;
  }

  if (error instanceof ValidationError && error.errors) {
    response.error.errors = error.errors;
  }

  if (requestId) {
    response.requestId = requestId;
  }

  return response;
}

// ============================================================================
// Error Handler Type
// ============================================================================

/** Route context containing dynamic route parameters (Next.js 15+ uses Promise) */
export interface RouteContext<P = Record<string, string>> {
  params: Promise<P>;
}

/** Generic API handler function signature for Next.js App Router */
export type ApiHandler<T = unknown, P = Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<P>
) => Promise<NextResponse<T>>;

// ============================================================================
// Main Error Handling Wrapper
// ============================================================================

/** Type guard to check if error has a name property */
function hasName(error: unknown): error is { name: string } {
  return typeof error === 'object' && error !== null && 'name' in error && typeof (error as { name: unknown }).name === 'string';
}

/** Type guard to check if error has a message property */
function hasMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string';
}

/** Type guard to check if error has a stack property */
function hasStack(error: unknown): error is { stack: string } {
  return typeof error === 'object' && error !== null && 'stack' in error && typeof (error as { stack: unknown }).stack === 'string';
}

/** Type guard to check if error has a code property (database errors) */
function hasCode(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code: unknown }).code === 'string';
}

/** Type guard for Zod-like error structure */
function isZodLikeError(error: unknown): error is { name: string; errors: Array<{ path: (string | number)[]; message: string }> } {
  return (
    hasName(error) &&
    error.name === 'ZodError' &&
    typeof error === 'object' &&
    error !== null &&
    'errors' in error &&
    Array.isArray((error as { errors: unknown }).errors)
  );
}

export function withErrorHandling<T = unknown, P = Record<string, string>>(
  handler: ApiHandler<T, P>
): (request: NextRequest, context: RouteContext<P>) => Promise<NextResponse<T | ErrorResponse>> {
  return async (request: NextRequest, context: RouteContext<P>): Promise<NextResponse<T | ErrorResponse>> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // Execute handler
      const response = await handler(request, context);

      // Log successful requests in development
      if (process.env.NODE_ENV === 'development') {
        const duration = Date.now() - startTime;
        logger.info(`[OK] ${request.method} ${request.nextUrl.pathname} - ${duration}ms`);
      }

      return response;

    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      // Extract error properties safely
      const errorName = hasName(error) ? error.name : 'Error';
      const errorMessage = hasMessage(error) ? error.message : 'Unknown error';
      const errorStack = hasStack(error) ? error.stack : undefined;

      // Log error with context
      logError({
        errorType: errorName,
        errorMessage: errorMessage,
        stackTrace: errorStack,
        requestPath: request.nextUrl.pathname,
        requestMethod: request.method,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          requestId,
          url: request.url,
          duration,
        },
      });

      // Handle different error types
      if (error instanceof ApiError) {
        return NextResponse.json(
          formatErrorResponse(error, requestId),
          { status: error.statusCode }
        );
      }

      // Handle ServiceError (backwards compatibility)
      if (error instanceof ServiceError) {
        const apiError = error.toApiError();
        return NextResponse.json(
          formatErrorResponse(apiError, requestId),
          { status: apiError.statusCode }
        );
      }

      // Handle Zod validation errors
      if (isZodLikeError(error)) {
        const validationError = new ValidationError(
          'Validation failed',
          formatZodErrors(error)
        );
        return NextResponse.json(
          formatErrorResponse(validationError, requestId),
          { status: 422 }
        );
      }

      // Handle database errors
      if (hasCode(error)) {
        const dbError = handleDatabaseError(error);
        return NextResponse.json(
          formatErrorResponse(dbError, requestId),
          { status: dbError.statusCode }
        );
      }

      // Log unexpected errors
      logger.error('[ERROR] Unexpected error', { error });

      // Return generic error for unknown errors (don't expose internal details)
      const genericError = new ApiError(
        process.env.NODE_ENV === 'development'
          ? errorMessage
          : 'Internal server error',
        500
      );

      return NextResponse.json(
        formatErrorResponse(genericError, requestId),
        { status: 500 }
      );
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Zod error structure for type safety */
interface ZodLikeError {
  errors: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

function formatZodErrors(error: ZodLikeError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const err of error.errors) {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  }

  return formatted;
}

/** Database error structure with PostgreSQL error code */
interface DatabaseError {
  code: string;
}

function handleDatabaseError(error: DatabaseError): ApiError {
  // PostgreSQL error codes
  switch (error.code) {
    case '23505': // Unique violation
      return new ConflictError('Resource already exists', 'DUPLICATE_ENTRY');

    case '23503': // Foreign key violation
      return new BadRequestError('Related resource not found', 'INVALID_REFERENCE');

    case '23502': // Not null violation
      return new BadRequestError('Required field is missing', 'MISSING_FIELD');

    case '22P02': // Invalid text representation
      return new BadRequestError('Invalid data format', 'INVALID_FORMAT');

    case '42P01': // Undefined table
      return new ServiceUnavailableError('Database schema error', 'SCHEMA_ERROR');

    default:
      return new ApiError('Database operation failed', 500, 'DATABASE_ERROR');
  }
}

// ============================================================================
// Async Error Catcher (for non-route async functions)
// ============================================================================

export async function catchAsync<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    logger.error('Async operation failed', { error });

    // Extract message and statusCode safely
    const message = hasMessage(error) ? error.message : 'Operation failed';
    const statusCode = (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof (error as { statusCode: unknown }).statusCode === 'number'
    )
      ? (error as { statusCode: number }).statusCode
      : 500;

    throw new ApiError(errorMessage || message, statusCode);
  }
}

// ============================================================================
// Assert helpers (for validation within handlers)
// ============================================================================

export function assert(condition: unknown, message: string, statusCode: number = 400): asserts condition {
  if (!condition) {
    throw new ApiError(message, statusCode);
  }
}

export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Required value is missing'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(message);
  }
}

export function assertAuthorized(
  condition: boolean,
  message: string = 'You are not authorized to perform this action'
): asserts condition {
  if (!condition) {
    throw new ForbiddenError(message);
  }
}




