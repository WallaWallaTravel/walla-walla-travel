import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { lodgingClickService } from '@/lib/services/lodging-click.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/lodging/analytics
 * Get click analytics for lodging properties
 *
 * Query params:
 * - start_date: YYYY-MM-DD (optional)
 * - end_date: YYYY-MM-DD (optional)
 * - days: number of days for trend data (default 30)
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const searchParams = request.nextUrl.searchParams;

  const startDate = searchParams.get('start_date') || undefined;
  const endDate = searchParams.get('end_date') || undefined;
  const days = parseInt(searchParams.get('days') || '30', 10);

  const dateFilter = { startDate, endDate };

  const [clickStats, platformBreakdown, clickTrends, totalClicks] = await Promise.all([
    lodgingClickService.getClickStats({ ...dateFilter, limit: 20 }),
    lodgingClickService.getPlatformBreakdown(dateFilter),
    lodgingClickService.getClickTrends(days),
    lodgingClickService.getTotalClicks(dateFilter),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      total_clicks: totalClicks,
      click_stats: clickStats,
      platform_breakdown: platformBreakdown,
      click_trends: clickTrends,
    },
    timestamp: new Date().toISOString(),
  });
});
