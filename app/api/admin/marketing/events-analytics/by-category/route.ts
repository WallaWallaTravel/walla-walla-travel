/**
 * Admin Marketing - Events Analytics by Category
 * GET /api/admin/marketing/events-analytics/by-category
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { eventsService } from '@/lib/services/events.service';
import { z } from 'zod';

const querySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const GET = withAdminAuth(
  async (request: NextRequest) => {
    const url = request.nextUrl;
    const params = querySchema.parse({
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    });

    const data = await eventsService.getAnalyticsByCategory(params.startDate, params.endDate);

    return NextResponse.json({
      success: true,
      data,
    });
  }
);
