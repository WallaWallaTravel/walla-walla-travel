/**
 * Standardized API Response System
 * Ensures consistent response format across all API endpoints
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata that can be attached to API responses
 */
export interface APIResponseMeta {
  timestamp: string;
  version: string;
  requestId?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  [key: string]: string | number | boolean | undefined | APIResponseMeta['pagination'];
}

export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: APIResponseMeta;
}

/**
 * Structured error details for validation errors, constraint violations, etc.
 */
export interface ErrorDetails {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
  cause?: string;
  constraint?: string;
  [key: string]: unknown;
}

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
    statusCode: number;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: ErrorDetails;
}

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Operations
  CREATE_FAILED: 'CREATE_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  
  // External Services
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  EMAIL_FAILED: 'EMAIL_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

// ============================================================================
// API Response Class
// ============================================================================

export class APIResponse {
  /**
   * Success response
   */
  static success<T>(data: T, meta?: Partial<Omit<APIResponseMeta, 'timestamp' | 'version'>>): NextResponse<APISuccessResponse<T>> {
    return NextResponse.json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        ...meta,
      },
    });
  }

  /**
   * Error response
   */
  static error(
    error: APIError,
    statusCode: number = 400
  ): NextResponse<APIErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          statusCode,
        },
      },
      { status: statusCode }
    );
  }

  /**
   * Validation error response (from Zod)
   */
  static validation(zodError: ZodError): NextResponse<APIErrorResponse> {
    return this.error(
      {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: zodError.flatten(),
      },
      400
    );
  }

  /**
   * Not found response
   */
  static notFound(resource: string, identifier?: string): NextResponse<APIErrorResponse> {
    return this.error(
      {
        code: ErrorCodes.NOT_FOUND,
        message: identifier 
          ? `${resource} '${identifier}' not found`
          : `${resource} not found`,
      },
      404
    );
  }

  /**
   * Unauthorized response
   */
  static unauthorized(message: string = 'Authentication required'): NextResponse<APIErrorResponse> {
    return this.error(
      {
        code: ErrorCodes.UNAUTHORIZED,
        message,
      },
      401
    );
  }

  /**
   * Forbidden response
   */
  static forbidden(message: string = 'Access denied'): NextResponse<APIErrorResponse> {
    return this.error(
      {
        code: ErrorCodes.FORBIDDEN,
        message,
      },
      403
    );
  }

  /**
   * Rate limit exceeded response
   */
  static rateLimitExceeded(): NextResponse<APIErrorResponse> {
    return this.error(
      {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests. Please try again later.',
      },
      429
    );
  }

  /**
   * Internal server error response
   */
  static internalError(
    message: string = 'An unexpected error occurred',
    details?: ErrorDetails | string
  ): NextResponse<APIErrorResponse> {
    const sanitizedDetails = process.env.NODE_ENV === 'development'
      ? (typeof details === 'string' ? { cause: details } : details)
      : undefined;
    return this.error(
      {
        code: ErrorCodes.INTERNAL_ERROR,
        message,
        details: sanitizedDetails,
      },
      500
    );
  }

  /**
   * Database error response
   */
  static databaseError(operation: string): NextResponse<APIErrorResponse> {
    return this.error(
      {
        code: ErrorCodes.DATABASE_ERROR,
        message: `Database ${operation} failed`,
      },
      500
    );
  }

  /**
   * Conflict response (e.g., duplicate email)
   */
  static conflict(message: string, details?: ErrorDetails): NextResponse<APIErrorResponse> {
    return this.error(
      {
        code: ErrorCodes.CONFLICT,
        message,
        details,
      },
      409
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Next.js App Router route handler context
 * Next.js 15+ wraps params in Promise
 */
export interface RouteContext<P = Record<string, string>> {
  params: Promise<P>;
}

/**
 * Type for Next.js route handlers
 * Next.js 15+ requires context parameter to be required for dynamic routes
 */
export type RouteHandler<T = unknown, P = Record<string, string>> = (
  request: Request,
  context: RouteContext<P>
) => Promise<NextResponse<T>>;

/**
 * Wrap async API handler with error handling
 */
export function withErrorHandling<T = unknown, P = Record<string, string>>(
  handler: RouteHandler<T, P>
): RouteHandler<T | APIErrorResponse, P> {
  return async (request: Request, context: RouteContext<P>): Promise<NextResponse<T | APIErrorResponse>> => {
    try {
      return await handler(request, context);
    } catch (error: unknown) {
      logger.error('[API Error]', { error });

      if (error instanceof ZodError) {
        return APIResponse.validation(error);
      }

      if (error instanceof Error) {
        return APIResponse.internalError(error.message, error.stack);
      }

      return APIResponse.internalError();
    }
  };
}

/**
 * Create a typed API error
 */
export function createAPIError(
  code: string,
  message: string,
  details?: ErrorDetails
): APIError {
  return { code, message, details };
}


