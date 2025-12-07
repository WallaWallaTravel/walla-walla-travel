import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware/auth-wrapper';
import { validateBody } from '@/lib/api/middleware/validation';
import { timeCardService } from '@/lib/services/timecard.service';
import { z } from 'zod';

/**
 * POST /api/driver/timecard/clock-in
 * Clock in driver
 * 
 * ✅ REFACTORED: Service layer
 */

const ClockInSchema = z.object({
  vehicle_id: z.number().int().positive().optional(),
  work_reporting_location: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, session) => {
  // ✅ Validate
  const data = await validateBody(request, ClockInSchema);

  // ✅ Use service layer
  const timeCard = await timeCardService.clockIn({
    driver_id: parseInt(session.userId),
    vehicle_id: data.vehicle_id,
    work_reporting_location: data.work_reporting_location,
  });

  return NextResponse.json({
    success: true,
    data: timeCard,
    message: 'Clocked in successfully',
    timestamp: new Date().toISOString(),
  });
});




