import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { validateBody } from '@/lib/api/middleware/validation';
import { userService } from '@/lib/services/user.service';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * GET /api/admin/users
 * List all users with filters
 * 
 * ✅ REFACTORED: Service layer + admin auth
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const searchParams = request.nextUrl.searchParams;

  const filters: { role?: string; is_active?: boolean; limit?: number; offset?: number } = {};

  if (searchParams.get('role')) {
    filters.role = searchParams.get('role') ?? undefined;
  }
  if (searchParams.get('is_active')) {
    filters.is_active = searchParams.get('is_active') === 'true';
  }
  if (searchParams.get('limit')) {
    filters.limit = parseInt(searchParams.get('limit')!);
  }
  if (searchParams.get('offset')) {
    filters.offset = parseInt(searchParams.get('offset')!);
  }

  // ✅ Use service layer
  const result = await userService.list(filters);

  return NextResponse.json({
    success: true,
    data: {
      users: result.data,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/users
 * Create new user
 * 
 * ✅ REFACTORED: Service layer
 */

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['admin', 'driver']),
  phone: z.string().optional(),
});

export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest, _session) => {
  // ✅ Validate
  const data = await validateBody(request, CreateUserSchema);

  // ✅ Use service layer
  const user = await userService.create(data);

  return NextResponse.json({
    success: true,
    data: user,
    message: 'User created successfully',
    timestamp: new Date().toISOString(),
  });
})));




