import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { geologyContextService } from '@/lib/services/geology-context.service';

// ============================================================================
// GET /api/geology/topics - Get all published geology topics
// ============================================================================

export const GET = withErrorHandling(async () => {
  const topics = await geologyContextService.getTopicSummaries();

  return NextResponse.json({
    success: true,
    data: {
      topics,
      count: topics.length,
    },
  });
});
