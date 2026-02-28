import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { dailyDigestService } from '@/lib/services/daily-digest.service';

/**
 * GET /api/admin/today
 * Returns all data needed for the Today's Priorities page.
 * Reuses dailyDigestService.generateDigest() for consistency.
 */
export const GET = withAdminAuth(async (_request: NextRequest) => {
  const data = await dailyDigestService.generateDigest();

  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
});
