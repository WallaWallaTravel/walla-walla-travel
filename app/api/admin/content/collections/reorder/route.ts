import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { ContentService } from '@/lib/services/content.service';

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

// POST - Reorder collection items
async function postHandler(request: NextRequest) {
  await verifyAdmin(request);

  const body = await request.json();

  if (!body.collection_type || !Array.isArray(body.ordered_ids)) {
    throw new BadRequestError('collection_type and ordered_ids array are required');
  }

  await ContentService.reorderCollection(body.collection_type, body.ordered_ids);

  return NextResponse.json({
    success: true,
    message: 'Collection reordered',
  });
}

export const POST = withErrorHandling(postHandler);
