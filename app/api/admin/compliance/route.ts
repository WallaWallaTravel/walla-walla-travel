/**
 * Compliance API
 *
 * GET - Get compliance summary for dashboard
 * POST - Trigger compliance notification run (admin or cron only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { getSessionFromRequest } from '@/lib/auth/session';
import {
  getComplianceSummary,
  runComplianceNotifications,
} from '@/lib/services/compliance-notification.service';

/**
 * GET /api/admin/compliance
 * Returns compliance summary for dashboard display
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
  const summary = await getComplianceSummary();

  return NextResponse.json({
    summary: {
      expired: summary.expired.length,
      urgent: summary.urgent.length,
      warning: summary.warning.length,
      total: summary.expired.length + summary.urgent.length + summary.warning.length,
    },
    items: {
      expired: summary.expired,
      urgent: summary.urgent,
      warning: summary.warning,
    },
  });
});

/**
 * POST /api/admin/compliance
 * Trigger compliance notification run
 * Can be called by admin or by cron with secret
 */
export const POST = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Check for cron secret or admin session
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (cronSecret && cronSecret === expectedSecret) {
    // Valid cron request
  } else {
    // Check for admin session
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'admin') {
      throw new UnauthorizedError('Admin access or valid cron secret required');
    }
  }

  const result = await runComplianceNotifications();

  return NextResponse.json({
    success: true,
    result,
  });
});
