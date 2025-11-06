/**
 * API Error Handling
 * Standardized error classes and response formatting
 */

import { NextResponse } from 'next/server';

/**
 * Base API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
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
  constructor(message: string = 'Bad Request', details?: any) {
    super(400, message, 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(401, message, 'UNAUTHORIZED', details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', details?: any) {
    super(403, message, 'FORBIDDEN', details);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', details?: any) {
    super(404, `${resource} not found`, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', details?: any) {
    super(409, message, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(422, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(500, message, 'INTERNAL_ERROR', details);
    this.name = 'InternalServerError';
  }
}

/**
 * Service Unavailable Error (503)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable', details?: any) {
    super(503, message, 'SERVICE_UNAVAILABLE', details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Format error response
 */
export function formatErrorResponse(error: ApiError) {
  const response: any = {
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
  console.error('API Error:', error);

  // Handle known API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      formatErrorResponse(error),
      { status: error.statusCode }
    );
  }

  // Handle database errors
  if (error instanceof Error && 'code' in error) {
    const dbError = error as any;
    
    // Unique constraint violation
    if (dbError.code === '23505') {
      return NextResponse.json(
        formatErrorResponse(
          new ConflictError('Resource already exists', {
            constraint: dbError.constraint,
          })
        ),
        { status: 409 }
      );
    }

    // Foreign key violation
    if (dbError.code === '23503') {
      return NextResponse.json(
        formatErrorResponse(
          new BadRequestError('Referenced resource does not exist', {
            constraint: dbError.constraint,
          })
        ),
        { status: 400 }
      );
    }

    // Not null violation
    if (dbError.code === '23502') {
      return NextResponse.json(
        formatErrorResponse(
          new BadRequestError('Required field is missing', {
            column: dbError.column,
          })
        ),
        { status: 400 }
      );
    }
  }

  // Handle validation errors (Zod, etc.)
  if (error instanceof Error && error.name === 'ZodError') {
    return NextResponse.json(
      formatErrorResponse(
        new ValidationError('Validation failed', {
          issues: (error as any).issues,
        })
      ),
      { status: 422 }
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      formatErrorResponse(
        new InternalServerError(
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'An unexpected error occurred'
        )
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
export function withErrorHandling<T extends any[], R>(
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

