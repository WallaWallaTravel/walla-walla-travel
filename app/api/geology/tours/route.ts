import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { geologyContextService } from '@/lib/services/geology-context.service';

// ============================================================================
// GET /api/geology/tours - Get all active geology tours
// ============================================================================

export const GET = withErrorHandling(async () => {
  const tours = await geologyContextService.getTourSummaries();

  return NextResponse.json({
    success: true,
    data: {
      tours,
      count: tours.length,
    },
  });
});
