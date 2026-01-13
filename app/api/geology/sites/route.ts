import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { geologyContextService } from '@/lib/services/geology-context.service';

// ============================================================================
// GET /api/geology/sites - Get all published geology sites
// ============================================================================

export const GET = withErrorHandling(async () => {
  const sites = await geologyContextService.getSiteSummaries();

  return NextResponse.json({
    success: true,
    data: {
      sites,
      count: sites.length,
    },
  });
});
