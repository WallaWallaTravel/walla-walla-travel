import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, RouteContext } from '@/lib/api/middleware/error-handler';

interface RouteParams {
  shareCode: string;
}

export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { shareCode } = await context.params;
    return NextResponse.json({ message: 'Share trip endpoint - not yet implemented', shareCode }, { status: 501 });
  }
);
