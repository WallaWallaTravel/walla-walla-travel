import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middleware/auth-wrapper';
import { timeCardService } from '@/lib/services/timecard.service';
import { withCSRF } from '@/lib/api/middleware/csrf';

/**
 * POST /api/driver/timecard/clock-out
 * Clock out driver
 * 
 * ✅ REFACTORED: Service layer
 */

export const POST = withCSRF(
  withAuth(async (request: NextRequest, session) => {
  // ✅ Use service layer
  const timeCard = await timeCardService.clockOut(parseInt(session.userId));

  return NextResponse.json({
    success: true,
    data: timeCard,
    message: 'Clocked out successfully',
    timestamp: new Date().toISOString(),
  });
})
);




