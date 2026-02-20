import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';
import { lodgingService } from '@/lib/services/lodging.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  slug: string;
}

/**
 * GET /api/lodging/[slug]
 * Public detail view of a single lodging property by slug
 */
export const GET = withErrorHandling<unknown, RouteParams>(
  async (_request: NextRequest, context: RouteContext<RouteParams>) => {
    const { slug } = await context.params;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid slug parameter',
      }, { status: 400 });
    }

    const property = await lodgingService.getBySlug(slug);

    if (!property) {
      return NextResponse.json({
        success: false,
        error: 'Property not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        property,
      },
      timestamp: new Date().toISOString(),
    });
  }
);
