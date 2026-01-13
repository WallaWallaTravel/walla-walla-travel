import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { geologyContextService } from '@/lib/services/geology-context.service';

interface RouteParams {
  slug: string;
}

// ============================================================================
// GET /api/geology/topics/[slug] - Get a single geology topic
// ============================================================================

export const GET = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const { slug } = await context.params;

    const topic = await geologyContextService.getTopicBySlug(slug);

    if (!topic) {
      throw new NotFoundError('Topic not found');
    }

    // Get related facts for this topic
    const facts = await geologyContextService.getFactsByTopic(topic.id);

    return NextResponse.json({
      success: true,
      data: {
        topic,
        relatedFacts: facts,
      },
    });
  }
);
