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
    public details?: any
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

export type ApiHandler<T = any> = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse<T>>;

// ============================================================================
// Main Error Handling Wrapper
// ============================================================================

export function withErrorHandling<T = any>(
  handler: ApiHandler<T>
): (request: NextRequest, context?: any) => Promise<NextResponse<T | ErrorResponse>> {
  return async (request: NextRequest, context?: any): Promise<NextResponse<T | ErrorResponse>> => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // Execute handler
      const response = await handler(request, context);

      // Log successful requests in development
      if (process.env.NODE_ENV === 'development') {
        const duration = Date.now() - startTime;
        logger.info(`✅ ${request.method} ${request.nextUrl.pathname} - ${duration}ms`);
      }

      return response;

    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log error with context
      logError({
        errorType: error.name || 'Error',
        errorMessage: error.message || 'Unknown error',
        stackTrace: error.stack,
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
      if (error.name === 'ZodError') {
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
      if (error.code) {
        const dbError = handleDatabaseError(error);
        return NextResponse.json(
          formatErrorResponse(dbError, requestId),
          { status: dbError.statusCode }
        );
      }

      // Log unexpected errors
      logger.error('❌ Unexpected error:', error);

      // Return generic error for unknown errors (don't expose internal details)
      const genericError = new ApiError(
        process.env.NODE_ENV === 'development'
          ? error.message || 'Internal server error'
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

function formatZodErrors(error: any): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  if (error.errors && Array.isArray(error.errors)) {
    for (const err of error.errors) {
      const path = err.path.join('.');
      if (!formatted[path]) {
        formatted[path] = [];
      }
      formatted[path].push(err.message);
    }
  }

  return formatted;
}

function handleDatabaseError(error: any): ApiError {
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
  } catch (error: any) {
    logger.error('Async operation failed:', error);
    throw new ApiError(
      errorMessage || error.message || 'Operation failed',
      error.statusCode || 500
    );
  }
}

// ============================================================================
// Assert helpers (for validation within handlers)
// ============================================================================

export function assert(condition: any, message: string, statusCode: number = 400): asserts condition {
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




