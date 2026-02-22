import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, NotFoundError, RouteContext } from '@/lib/api/middleware/error-handler';
import { wineryService } from '@/lib/services/winery.service';

interface RouteParams {
  slug: string;
}

// ============================================================================
// GET /api/wineries/[slug] - Get a single winery by slug
// ============================================================================

export const GET = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const { slug } = await context.params;

    const winery = await wineryService.getBySlug(slug);

    if (!winery) {
      throw new NotFoundError('Winery not found');
    }

    return NextResponse.json({
      success: true,
      data: winery,
    });
  }
);
