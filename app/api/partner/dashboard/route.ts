import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';

/**
 * GET /api/partner/dashboard
 * Get partner dashboard data
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);
  
  // Note: 'partner' role check may fail if role is not in the type union - use string comparison
  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const data = await partnerService.getDashboardData(session.user.id);

  return NextResponse.json({
    success: true,
    ...data,
    timestamp: new Date().toISOString(),
  });
});

