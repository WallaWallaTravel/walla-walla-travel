/**
 * Request Validation System
 * Provides type-safe request validation using Zod
 */

import { ZodSchema, ZodError, ZodIssueCode } from 'zod';
import { NextRequest } from 'next/server';

// ============================================================================
// Validation Error
// ============================================================================

export class ValidationError extends Error {
  constructor(public errors: ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

// ============================================================================
// Request Validators
// ============================================================================

/**
 * Validate request body
 */
export async function validateRequest<T>(
  schema: ZodSchema<T>,
  request: Request | NextRequest
): Promise<T> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      throw new ValidationError(result.error);
    }

    return result.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError(new ZodError([{
        code: ZodIssueCode.custom,
        path: [],
        message: 'Invalid JSON'
      }]));
    }
    throw error;
  }
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  request: Request | NextRequest
): T {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);

  const result = schema.safeParse(params);

  if (!result.success) {
    throw new ValidationError(result.error);
  }

  return result.data;
}

/**
 * Validate path parameters
 */
export function validateParams<T>(
  schema: ZodSchema<T>,
  params: Record<string, string | string[]>
): T {
  const result = schema.safeParse(params);

  if (!result.success) {
    throw new ValidationError(result.error);
  }

  return result.data;
}

/**
 * Validate headers
 */
export function validateHeaders<T>(
  schema: ZodSchema<T>,
  request: Request | NextRequest
): T {
  const headers = Object.fromEntries(request.headers.entries());

  const result = schema.safeParse(headers);

  if (!result.success) {
    throw new ValidationError(result.error);
  }

  return result.data;
}

// ============================================================================
// Validation Middleware
// ============================================================================

/**
 * Create a validation middleware for request body
 */
export function withBodyValidation<T>(schema: ZodSchema<T>) {
  return async (request: Request | NextRequest): Promise<T> => {
    return await validateRequest(schema, request);
  };
}

/**
 * Create a validation middleware for query parameters
 */
export function withQueryValidation<T>(schema: ZodSchema<T>) {
  return (request: Request | NextRequest): T => {
    return validateQuery(schema, request);
  };
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}


