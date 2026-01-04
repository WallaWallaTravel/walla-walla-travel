/**
 * Edge Caching Middleware
 *
 * @module lib/api/middleware/cache
 * @description Provides caching headers for Vercel Edge and CDN caching.
 * Uses stale-while-revalidate pattern for optimal performance.
 *
 * Usage:
 *   import { withCache, CachePresets } from '@/lib/api/middleware/cache';
 *
 *   // Cache for 5 minutes, stale for 1 hour
 *   export const GET = withCache(CachePresets.SHORT)(handler);
 *
 *   // Cache for 1 hour, stale for 24 hours
 *   export const GET = withCache(CachePresets.LONG)(handler);
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Max age in seconds for CDN cache */
  maxAge: number;
  /** Stale-while-revalidate duration in seconds */
  staleWhileRevalidate: number;
  /** Whether to set private (browser-only) or public (CDN) cache */
  isPrivate?: boolean;
  /** Additional cache control directives */
  directives?: string[];
}

/**
 * Preset cache configurations
 */
export const CachePresets = {
  /** Very short cache for real-time data (30s, stale 2m) */
  REALTIME: {
    maxAge: 30,
    staleWhileRevalidate: 120,
  } as CacheOptions,

  /** Short cache for frequently updated data (1m, stale 5m) */
  SHORT: {
    maxAge: 60,
    staleWhileRevalidate: 300,
  } as CacheOptions,

  /** Medium cache for semi-static data (5m, stale 1h) */
  MEDIUM: {
    maxAge: 300,
    staleWhileRevalidate: 3600,
  } as CacheOptions,

  /** Long cache for rarely changed data (1h, stale 24h) */
  LONG: {
    maxAge: 3600,
    staleWhileRevalidate: 86400,
  } as CacheOptions,

  /** Static cache for essentially immutable data (24h, stale 7d) */
  STATIC: {
    maxAge: 86400,
    staleWhileRevalidate: 604800,
  } as CacheOptions,

  /** No caching - bypass CDN and browser cache */
  NONE: {
    maxAge: 0,
    staleWhileRevalidate: 0,
    directives: ['no-store', 'no-cache', 'must-revalidate'],
  } as CacheOptions,
};

/**
 * Build cache-control header value from options
 */
export function buildCacheControlHeader(options: CacheOptions): string {
  const parts: string[] = [];

  if (options.directives?.includes('no-store')) {
    return 'no-store, no-cache, must-revalidate';
  }

  // Public (CDN) or private (browser-only)
  parts.push(options.isPrivate ? 'private' : 'public');

  // Max age for CDN edge cache
  parts.push(`s-maxage=${options.maxAge}`);

  // Browser cache (shorter for better revalidation)
  parts.push(`max-age=${Math.min(options.maxAge, 60)}`);

  // Stale-while-revalidate for background updates
  if (options.staleWhileRevalidate > 0) {
    parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }

  // Additional directives
  if (options.directives) {
    parts.push(...options.directives);
  }

  return parts.join(', ');
}

/**
 * Add cache headers to a response
 */
export function addCacheHeaders(response: NextResponse, options: CacheOptions): NextResponse {
  const cacheControl = buildCacheControlHeader(options);
  response.headers.set('Cache-Control', cacheControl);

  // Add CDN-Cache-Control for Vercel-specific caching
  response.headers.set('CDN-Cache-Control', cacheControl);

  // Add Vercel-CDN-Cache-Control for fine-grained Vercel control
  response.headers.set('Vercel-CDN-Cache-Control', `max-age=${options.maxAge}`);

  return response;
}

/**
 * Higher-order function to wrap handlers with caching
 */
export function withCache(options: CacheOptions) {
  return function <T extends unknown[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      // Only cache GET requests
      if (request.method !== 'GET') {
        return handler(request, ...args);
      }

      const response = await handler(request, ...args);

      // Don't cache error responses
      if (response.status >= 400) {
        return response;
      }

      return addCacheHeaders(response, options);
    };
  };
}

/**
 * Create a cached JSON response
 */
export function cachedJsonResponse<T>(
  data: T,
  options: CacheOptions = CachePresets.SHORT,
  init?: ResponseInit
): NextResponse<T> {
  const response = NextResponse.json(data, init);
  return addCacheHeaders(response, options) as NextResponse<T>;
}
