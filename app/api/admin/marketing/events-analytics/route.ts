/**
 * Admin Marketing - Events Analytics Overview
 * GET /api/admin/marketing/events-analytics
 * Returns aggregated stats with date range and daily trend data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventsService } from '@/lib/services/events.service';
import { z } from 'zod';

const querySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(7).max(365).optional().default(30),
});

export const GET = withAdminAuth(
  async (request: NextRequest) => {
    const url = request.nextUrl;
    const params = querySchema.parse({
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      days: url.searchParams.get('days') || undefined,
    });

    const [overview, trends] = await Promise.all([
      eventsService.getAnalyticsOverview(params.startDate, params.endDate),
      eventsService.getAnalyticsTrends(params.days),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview,
        trends,
      },
    });
  }
);
