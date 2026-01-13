/**
 * Validation Utilities
 *
 * Helper functions for using Zod schemas in API routes.
 * Provides clean validation and error formatting.
 *
 * @example
 * import { validate } from '@/lib/validation';
 * import { loginSchema } from '@/lib/validation/schemas/auth';
 *
 * export async function POST(request: NextRequest) {
 *   const result = await validate(request, loginSchema);
 *   if (!result.success) {
 *     return result.error; // Returns NextResponse with formatted errors
 *   }
 *   const data = result.data; // Typed and validated data
 * }
 */

import { z, ZodSchema } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Successful validation result
 */
export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

/**
 * Failed validation result
 */
export interface ValidationFailure {
  success: false;
  error: NextResponse;
  errors: ValidationError[];
}

/**
 * Validation result union type
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Format Zod errors into user-friendly error messages
 */
export function formatZodErrors(error: z.ZodError): ValidationError[] {
  // Zod v4 uses 'issues' instead of 'errors'
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Create error response for validation failures
 */
export function validationErrorResponse(
  errors: ValidationError[],
  statusCode: number = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      errors,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Validate request body against a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result with typed data or error response
 *
 * @example
 * const result = await validate(request, loginSchema);
 * if (!result.success) {
 *   return result.error;
 * }
 * // result.data is now typed and validated
 * const { email, password } = result.data;
 */
export async function validate<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (_error) {
      return {
        success: false,
        error: validationErrorResponse([
          {
            field: 'body',
            message: 'Invalid JSON in request body',
            code: 'invalid_json',
          },
        ]),
        errors: [
          {
            field: 'body',
            message: 'Invalid JSON in request body',
            code: 'invalid_json',
          },
        ],
      };
    }

    // Validate against schema
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return {
        success: false,
        error: validationErrorResponse(errors),
        errors,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (_error) {
    return {
      success: false,
      error: validationErrorResponse([
        {
          field: 'unknown',
          message: 'An unexpected validation error occurred',
          code: 'unknown_error',
        },
      ], 500),
      errors: [
        {
          field: 'unknown',
          message: 'An unexpected validation error occurred',
          code: 'unknown_error',
        },
      ],
    };
  }
}

/**
 * Validate data directly (without request object)
 *
 * Useful for validating data from other sources like database queries.
 *
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Validation result with typed data or formatted errors
 *
 * @example
 * const result = validateData(userData, profileUpdateSchema);
 * if (!result.success) {
 *   console.error(result.errors);
 *   return;
 * }
 * // result.data is now typed and validated
 */
export function validateData<T>(
  data: unknown,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: formatZodErrors(result.error),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate query parameters from URL
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result with typed data or error response
 *
 * @example
 * const querySchema = z.object({
 *   page: z.coerce.number().min(1).default(1),
 *   limit: z.coerce.number().min(1).max(100).default(10),
 * });
 *
 * const result = validateQuery(request, querySchema);
 * if (!result.success) {
 *   return result.error;
 * }
 * const { page, limit } = result.data;
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse; errors: ValidationError[] } {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const result = schema.safeParse(params);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return {
        success: false,
        error: validationErrorResponse(errors),
        errors,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (_error) {
    return {
      success: false,
      error: validationErrorResponse([
        {
          field: 'query',
          message: 'Failed to parse query parameters',
          code: 'query_parse_error',
        },
      ], 400),
      errors: [
        {
          field: 'query',
          message: 'Failed to parse query parameters',
          code: 'query_parse_error',
        },
      ],
    };
  }
}

/**
 * Combine multiple validation errors
 *
 * Useful when validating multiple things in sequence.
 */
export function combineErrors(...errorArrays: ValidationError[][]): ValidationError[] {
  return errorArrays.flat();
}

/**
 * Check if value passes schema validation (boolean result)
 *
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns true if valid, false otherwise
 */
export function isValid<T>(data: unknown, schema: ZodSchema<T>): boolean {
  return schema.safeParse(data).success;
}

// Re-export validation schemas for convenience
export * from './schemas/auth';
export * from './schemas/booking';
export * from './schemas/trip';
