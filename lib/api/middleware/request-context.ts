/**
 * Request Context Middleware
 *
 * @module lib/api/middleware/request-context
 * @description Provides correlation ID tracking for distributed request tracing.
 * Uses AsyncLocalStorage to maintain request context across async operations.
 *
 * Features:
 * - UUID generation for each request
 * - Thread-safe context storage via AsyncLocalStorage
 * - Automatic propagation through async call chains
 * - Header-based correlation ID for cross-service tracing
 */

import { AsyncLocalStorage } from 'async_hooks';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Request context containing correlation ID and metadata
 */
interface RequestContext {
  requestId: string;
  startTime: number;
  path?: string;
  method?: string;
  userId?: string;
}

// AsyncLocalStorage for thread-safe context
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

// Header name for correlation ID (industry standard)
export const CORRELATION_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER_ALT = 'x-correlation-id';

/**
 * Generate a new correlation ID
 * Uses Web Crypto API for edge runtime compatibility
 */
export function generateRequestId(): string {
  // crypto.randomUUID() is available in both Node.js and Edge runtime
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get the current request context
 * Returns undefined if called outside of a request context
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get the current request ID
 * Returns a fallback ID if called outside of a request context
 */
export function getRequestId(): string {
  const context = getRequestContext();
  return context?.requestId || `fallback-${Date.now()}`;
}

/**
 * Get request duration in milliseconds
 */
export function getRequestDuration(): number {
  const context = getRequestContext();
  if (!context) return 0;
  return Date.now() - context.startTime;
}

/**
 * Set user ID in the current request context
 */
export function setContextUserId(userId: string): void {
  const context = getRequestContext();
  if (context) {
    context.userId = userId;
  }
}

/**
 * Run a function within a request context
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Run an async function within a request context
 */
export async function runWithRequestContextAsync<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Create a new request context from a request
 * Extracts correlation ID from headers or generates a new one
 */
export function createRequestContext(request: NextRequest): RequestContext {
  // Check for existing correlation ID from upstream
  const existingId =
    request.headers.get(CORRELATION_ID_HEADER) ||
    request.headers.get(CORRELATION_ID_HEADER_ALT);

  return {
    requestId: existingId || generateRequestId(),
    startTime: Date.now(),
    path: request.nextUrl.pathname,
    method: request.method,
  };
}

/**
 * Add correlation ID headers to a response
 */
export function addCorrelationHeaders(
  response: NextResponse,
  requestId?: string
): NextResponse {
  const id = requestId || getRequestId();
  response.headers.set(CORRELATION_ID_HEADER, id);
  return response;
}

/**
 * Higher-order function to wrap API handlers with request context
 *
 * Usage:
 * ```ts
 * export const POST = withRequestContext(async (request) => {
 *   const requestId = getRequestId();
 *   // Handler code with correlation ID
 * })
 * ```
 */
export function withRequestContext<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const context = createRequestContext(request);

    return runWithRequestContextAsync(context, async () => {
      const response = await handler(request, ...args);

      // Add correlation ID to response
      addCorrelationHeaders(response, context.requestId);

      // Add timing header
      const duration = Date.now() - context.startTime;
      response.headers.set('x-response-time', `${duration}ms`);

      return response;
    });
  };
}

/**
 * Combine with error handling and rate limiting
 * Returns the context for use in the handler
 */
export function getContextForHandler(): {
  requestId: string;
  duration: () => number;
  path?: string;
  method?: string;
  userId?: string;
} {
  const context = getRequestContext();
  return {
    requestId: context?.requestId || getRequestId(),
    duration: () => getRequestDuration(),
    path: context?.path,
    method: context?.method,
    userId: context?.userId,
  };
}

/**
 * Create headers object with correlation ID for outbound requests
 */
export function getOutboundHeaders(): Record<string, string> {
  const requestId = getRequestId();
  return {
    [CORRELATION_ID_HEADER]: requestId,
  };
}
