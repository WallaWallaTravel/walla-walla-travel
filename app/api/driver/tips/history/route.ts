/**
 * GET /api/driver/tips/history
 *
 * Get tip history for the authenticated driver
 * Supports filtering by date range, status, and payroll export status
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { requireAuth, requireDriver } from '@/lib/api/middleware/auth';
import { tipService } from '@/lib/services/tip.service';
import { TipHistoryQuerySchema } from '@/lib/validation/schemas/tip.schemas';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Authenticate and authorize
  const session = await requireAuth(request);
  await requireDriver(session);

  // Parse and validate query parameters
  const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = TipHistoryQuerySchema.parse(queryParams);

  // Get tips for the driver
  const { tips, total } = await tipService.getDriverTips(session.user.id, {
    startDate: filters.start_date,
    endDate: filters.end_date,
    status: filters.status,
    payrollExported: filters.payroll_exported,
    limit: filters.limit,
    offset: filters.offset,
  });

  // Calculate summary stats
  const successfulTips = tips.filter((t) => t.payment_status === 'succeeded');
  const totalAmount = successfulTips.reduce((sum, t) => sum + Number(t.amount), 0);
  const unexportedCount = successfulTips.filter((t) => !t.payroll_exported).length;

  return NextResponse.json({
    success: true,
    tips,
    pagination: {
      total,
      limit: filters.limit,
      offset: filters.offset,
      hasMore: filters.offset + tips.length < total,
    },
    summary: {
      totalAmount,
      tipCount: successfulTips.length,
      unexportedCount,
    },
    timestamp: new Date().toISOString(),
  });
});
