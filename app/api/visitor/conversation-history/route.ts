import { NextRequest, NextResponse } from 'next/server';
import { getVisitorConversationHistory, getVisitorByUUID } from '@/lib/visitor/visitor-tracking';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/visitor/conversation-history?visitor_uuid=xxx
 * Retrieve conversation history for a visitor
 */
export const GET = withErrorHandling<unknown>(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const visitor_uuid = searchParams.get('visitor_uuid');
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!visitor_uuid) {
    throw new BadRequestError('visitor_uuid is required');
  }

  // Get visitor
  const visitor = await getVisitorByUUID(visitor_uuid);
  if (!visitor) {
    return NextResponse.json(
      { success: true, history: [], visitor: null },
      { status: 200 }
    );
  }

  // Get conversation history
  const history = await getVisitorConversationHistory(visitor.id, limit);

  return NextResponse.json({
    success: true,
    visitor: {
      id: visitor.id,
      visitor_uuid: visitor.visitor_uuid,
      email: visitor.email,
      name: visitor.name,
      visit_count: visitor.visit_count,
      total_queries: visitor.total_queries,
      last_visit_at: visitor.last_visit_at,
    },
    history: history.map(q => ({
      id: q.id,
      query: q.query_text,
      response: q.response_text,
      model: q.model,
      rating: q.user_rating,
      timestamp: q.created_at,
    })),
  });
});
