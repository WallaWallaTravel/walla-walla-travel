import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import type { RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { lodgingService } from '@/lib/services/lodging.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/lodging/[id]/verify
 * Mark a lodging property as verified by the current admin user
 */
export const POST = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await (context as RouteContext<{ id: string }>).params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid property ID',
    }, { status: 400 });
  }

  const property = await lodgingService.verify(numId, parseInt(session.userId, 10));

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
});
