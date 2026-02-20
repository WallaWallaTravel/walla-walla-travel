import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';

interface RouteParams {
  slug: string;
}

export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { slug } = await context.params;
    return NextResponse.json({ message: 'Winery endpoint - not yet implemented', slug }, { status: 501 });
  }
);
