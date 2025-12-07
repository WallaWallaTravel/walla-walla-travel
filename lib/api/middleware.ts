/**
 * API Middleware
 * Rate limiting, authentication, CORS, security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { isProduction } from '@/lib/config/env';

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Store for rate limit counters
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter
 * For production, use Redis or Upstash
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 60 }
): Promise<NextResponse | null> {
  // Skip in development for easier testing
  if (!isProduction) {
    return null;
  }

  const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown';
  
  const key = `ratelimit:${ip}`;
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Increment counter
  entry.count++;
  
  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          statusCode: 429,
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetAt.toString(),
        },
      }
    );
  }
  
  // Add rate limit headers
  const remaining = config.maxRequests - entry.count;
  
  // Clean up old entries periodically (prevent memory leak)
  if (Math.random() < 0.01) { // 1% chance
    cleanupRateLimitStore();
  }
  
  return null; // Continue processing
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limit decorator for different tiers
 */
export const rateLimiters = {
  // Public endpoints (strict)
  public: (request: NextRequest) => 
    rateLimit(request, { windowMs: 60000, maxRequests: 20 }),
  
  // Authenticated endpoints (moderate)
  authenticated: (request: NextRequest) => 
    rateLimit(request, { windowMs: 60000, maxRequests: 100 }),
  
  // Admin endpoints (lenient)
  admin: (request: NextRequest) => 
    rateLimit(request, { windowMs: 60000, maxRequests: 500 }),
  
  // API key endpoints (custom)
  apiKey: (request: NextRequest) => 
    rateLimit(request, { windowMs: 60000, maxRequests: 1000 }),
};

// ============================================================================
// Authentication
// ============================================================================

/**
 * Check if request has valid authentication
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ userId: number; email: string } | NextResponse> {
  // Get session from cookies or header
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('session');
  
  if (!authHeader && !sessionCookie) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401,
        },
      },
      { status: 401 }
    );
  }
  
  try {
    // TODO: Implement actual JWT verification
    // For now, return a mock user
    // const token = authHeader?.replace('Bearer ', '') || sessionCookie?.value;
    // const decoded = await verifyJWT(token);
    
    return {
      userId: 1, // Mock
      email: 'user@example.com', // Mock
    };
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          statusCode: 401,
        },
      },
      { status: 401 }
    );
  }
}

/**
 * Check if user has required role
 */
export function requireRole(
  user: { userId: number; email: string },
  requiredRole: 'admin' | 'driver' | 'customer'
): boolean {
  // TODO: Implement actual role checking
  // For now, return true
  return true;
}

// ============================================================================
// CORS
// ============================================================================

/**
 * CORS headers
 */
export function getCORSHeaders(origin?: string): HeadersInit {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean);
  
  const originAllowed = origin && allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': originAllowed ? origin : (allowedOrigins[0] || '*'),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight
 */
export function handleCORS(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCORSHeaders(request.headers.get('origin') || undefined),
    });
  }
  return null;
}

// ============================================================================
// Security Headers
// ============================================================================

/**
 * Security headers for all responses
 */
export function getSecurityHeaders(): HeadersInit {
  return {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  };
}

// ============================================================================
// Request Logging
// ============================================================================

/**
 * Log HTTP request
 */
export function logRequest(
  request: NextRequest,
  startTime: number,
  statusCode?: number
): void {
  const duration = Date.now() - startTime;
  const method = request.method;
  const url = request.nextUrl.pathname;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  console.log(
    JSON.stringify({
      type: 'http_request',
      method,
      url,
      ip,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
    })
  );
}

// ============================================================================
// Middleware Composer
// ============================================================================

type MiddlewareFunction = (request: NextRequest) => Promise<NextResponse | null> | NextResponse | null;

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(...middlewares: MiddlewareFunction[]) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    for (const middleware of middlewares) {
      const result = await middleware(request);
      if (result) {
        return result; // Early return if middleware returns a response
      }
    }
    return null; // Continue to handler
  };
}

/**
 * Add security headers to a response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  const securityHeaders = getSecurityHeaders();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Route context with params (Next.js 15+ uses Promise-wrapped params)
 */
interface RouteContext<P = Record<string, string>> {
  params: Promise<P>;
}

/**
 * Wrap API handler with middleware
 * Supports both simple handlers and handlers with route context (params)
 */
export function withMiddleware<P = Record<string, string>>(
  handler: (request: NextRequest, context?: RouteContext<P>) => Promise<NextResponse>,
  ...middlewares: MiddlewareFunction[]
) {
  return async (request: NextRequest, context?: RouteContext<P>): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      // Handle CORS preflight
      const corsResponse = handleCORS(request);
      if (corsResponse) {
        return addSecurityHeaders(corsResponse);
      }
      
      // Run middleware
      for (const middleware of middlewares) {
        const result = await middleware(request);
        if (result) {
          logRequest(request, startTime, result.status);
          return addSecurityHeaders(result);
        }
      }
      
      // Run handler with optional context
      const response = await handler(request, context);
      logRequest(request, startTime, response.status);
      
      // Add CORS and security headers to response
      const corsHeaders = getCORSHeaders(request.headers.get('origin') || undefined);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return addSecurityHeaders(response);
    } catch (error) {
      logRequest(request, startTime, 500);
      throw error;
    }
  };
}


