/**
 * Admin Marketing - Events Analytics by Coordinator
 * GET /api/admin/marketing/events-analytics/by-coordinator
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

    const data = await eventsService.getAnalyticsByCoordinator(params.startDate, params.endDate);

    return NextResponse.json({
      success: true,
      data,
    });
  }
);
