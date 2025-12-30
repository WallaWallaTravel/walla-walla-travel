import { logger } from '@/lib/logger';
/**
 * Request Validation Middleware
 * 
 * Provides helpers for validating requests with Zod schemas
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ValidationError } from './error-handler';

// ============================================================================
// Validate Request Body
// ============================================================================

export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw new ValidationError(
        'Request validation failed',
        formatZodErrors(error)
      );
    }
    throw error;
  }
}

// ============================================================================
// Validate Query Parameters
// ============================================================================

export function validateQuery<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): T {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    return schema.parse(query);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw new ValidationError(
        'Query parameter validation failed',
        formatZodErrors(error)
      );
    }
    throw error;
  }
}

// ============================================================================
// Validate URL Parameters
// ============================================================================

export async function validateParams<T>(
  params: Promise<any> | any,
  schema: z.ZodType<T>
): Promise<T> {
  try {
    // Handle both Promise and direct params
    const resolvedParams = params instanceof Promise ? await params : params;
    return schema.parse(resolvedParams);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      throw new ValidationError(
        'URL parameter validation failed',
        formatZodErrors(error)
      );
    }
    throw error;
  }
}

// ============================================================================
// Format Zod Errors
// ============================================================================

function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  // Zod v4 uses 'issues' instead of 'errors'
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

// ============================================================================
// Export for convenience
// ============================================================================

export { ValidationError } from './error-handler';




