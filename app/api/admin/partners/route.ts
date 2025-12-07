import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';

/**
 * GET /api/admin/partners
 * Get all partners (admin only)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);
  
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const partners = await partnerService.getAllPartners();

  return NextResponse.json({
    success: true,
    partners,
    count: partners.length,
    timestamp: new Date().toISOString(),
  });
});

