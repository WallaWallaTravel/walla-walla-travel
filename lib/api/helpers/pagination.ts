/**
 * Pagination Helpers
 *
 * Centralized pagination parsing and metadata building.
 * Replaces 30+ hand-rolled implementations across API routes.
 *
 * @module lib/api/helpers/pagination
 *
 * @example
 * ```typescript
 * import { parsePagination, buildPaginationMeta } from '@/lib/api/helpers/pagination';
 *
 * export const GET = withErrorHandling(async (request: NextRequest) => {
 *   const { page, limit, offset } = parsePagination(request);
 *   const result = await query(`SELECT ... LIMIT $1 OFFSET $2`, [limit, offset]);
 *   const total = await getCount(...);
 *   return NextResponse.json({
 *     success: true,
 *     data: result.rows,
 *     pagination: buildPaginationMeta({ page, limit, offset }, total),
 *   });
 * });
 * ```
 */

import { NextRequest } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationOptions {
  /** Default number of results per page (default: 50) */
  defaultLimit?: number;
  /** Maximum allowed limit (default: 100) */
  maxLimit?: number;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Parse pagination parameters from a NextRequest's query string.
 *
 * Supports two modes:
 * - Page-based: `?page=2&limit=50` (most routes)
 * - Offset-based: `?offset=50&limit=50` (v1 API routes)
 *
 * If both `page` and `offset` are provided, `page` takes precedence.
 */
export function parsePagination(
  request: NextRequest,
  options: PaginationOptions = {}
): PaginationParams {
  const { defaultLimit = 50, maxLimit = 100 } = options;
  const { searchParams } = new URL(request.url);

  const rawPage = searchParams.get('page');
  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');

  // Validate and clamp limit
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(rawLimit || String(defaultLimit), 10) || defaultLimit)
  );

  // Page-based takes precedence
  if (rawPage) {
    const page = Math.max(1, parseInt(rawPage, 10) || 1);
    return { page, limit, offset: (page - 1) * limit };
  }

  // Offset-based fallback
  if (rawOffset) {
    const offset = Math.max(0, parseInt(rawOffset, 10) || 0);
    const page = Math.floor(offset / limit) + 1;
    return { page, limit, offset };
  }

  // Default: page 1
  return { page: 1, limit, offset: 0 };
}

/**
 * Build pagination metadata for API responses.
 */
export function buildPaginationMeta(
  params: PaginationParams,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit) || 0;

  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}
