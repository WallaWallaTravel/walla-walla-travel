import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { partnerService } from '@/lib/services/partner.service';

/**
 * GET /api/admin/partners
 * Get all partners (admin only)
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
  const partners = await partnerService.getAllPartners();

  return NextResponse.json({
    success: true,
    partners,
    count: partners.length,
    timestamp: new Date().toISOString(),
  });
});







