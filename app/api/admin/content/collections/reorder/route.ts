import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { ContentService } from '@/lib/services/content.service';

// POST - Reorder collection items
const postHandler = withAdminAuth(async (request: NextRequest, _session) => {
  const body = await request.json();

  if (!body.collection_type || !Array.isArray(body.ordered_ids)) {
    throw new BadRequestError('collection_type and ordered_ids array are required');
  }

  await ContentService.reorderCollection(body.collection_type, body.ordered_ids);

  return NextResponse.json({
    success: true,
    message: 'Collection reordered',
  });
});

export const POST = postHandler;
