/**
 * Standardized API Response System
 * Ensures consistent response format across all API endpoints
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    statusCode: number;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
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
  static success<T>(data: T, meta?: Record<string, any>): NextResponse<APISuccessResponse<T>> {
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
    details?: any
  ): NextResponse<APIErrorResponse> {
    return this.error(
      {
        code: ErrorCodes.INTERNAL_ERROR,
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined,
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
  static conflict(message: string, details?: any): NextResponse<APIErrorResponse> {
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
 * Wrap async API handler with error handling
 */
export function withErrorHandling<T = any>(
  handler: (request: Request, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (request: Request, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      console.error('[API Error]', error);

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
  details?: any
): APIError {
  return { code, message, details };
}


