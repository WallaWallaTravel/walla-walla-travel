/**
 * Login API
 * POST /api/auth/login
 *
 * Authenticates user and creates session via the old JWT system.
 * The old JWT is the source of truth for auth — middleware reads it.
 * Auth.js session cookie is set separately after login succeeds.
 *
 * ✅ REFACTORED: Service layer + error handling + audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { setSessionCookie } from '@/lib/auth/session';
import { authService } from '@/lib/services/auth.service';
import { auditService } from '@/lib/services/audit.service';
import { z } from 'zod';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Get client IP from request headers (Next.js 15 removed request.ip)
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIp || 'unknown';
}

export const POST = withRateLimit(rateLimiters.auth)(
  withErrorHandling(async (request: NextRequest) => {
  // ✅ Validate with Zod
  const credentials = await validateBody(request, LoginSchema);

  // ✅ Use auth service (with IP and user-agent for session tracking)
  const userAgent = request.headers.get('user-agent') || undefined;
  const result = await authService.login(credentials, getClientIp(request), userAgent);

  // ✅ Audit log: successful login
  auditService.logFromRequest(request, result.user.id, 'login', {
    email: credentials.email,
    role: result.user.role,
  }).catch(() => {}); // Non-blocking

  // ✅ Set session cookie and return standardized response
  const response = NextResponse.json({
    success: true,
    data: {
      user: result.user,
      redirectTo: result.redirectTo,
    },
    timestamp: new Date().toISOString(),
  });

  // Set JWT session cookie — this is the ONLY auth that middleware reads
  setSessionCookie(response, result.token);

  // Auth.js session cookie is set lazily on first auth() call that finds
  // a valid old-JWT but no Auth.js cookie. See auth.ts callbacks.

  return response;
}));
