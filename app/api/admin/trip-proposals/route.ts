/**
 * Trip Proposals API Routes
 * GET /api/admin/trip-proposals - List all trip proposals
 * POST /api/admin/trip-proposals - Create a new trip proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import {
  CreateTripProposalSchema,
  SaveDraftSchema,
  TRIP_PROPOSAL_STATUS,
} from '@/lib/types/trip-proposal';
import { z } from 'zod';

// Query parameter schema for listing
const ListFiltersSchema = z.object({
  status: z.enum(TRIP_PROPOSAL_STATUS).optional(),
  brand_id: z.coerce.number().int().positive().optional(),
  start_date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().max(100).optional(),
  include_archived: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/admin/trip-proposals
 * List trip proposals with filters
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const searchParams = request.nextUrl.searchParams;

  const rawFilters: Record<string, string | undefined> = {
    status: searchParams.get('status') || undefined,
    brand_id: searchParams.get('brand_id') || undefined,
    start_date_from: searchParams.get('start_date_from') || undefined,
    start_date_to: searchParams.get('start_date_to') || undefined,
    search: searchParams.get('search') || undefined,
    include_archived: searchParams.get('include_archived') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
  };

  const parseResult = ListFiltersSchema.safeParse(rawFilters);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid query parameters',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const result = await tripProposalService.list(parseResult.data);

  return NextResponse.json({
    success: true,
    data: {
      proposals: result.proposals,
      total: result.total,
      limit: parseResult.data.limit,
      offset: parseResult.data.offset,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/trip-proposals
 * Create a new trip proposal
 */
export const POST = withAdminAuth(async (request: NextRequest, session) => {
  const body = await request.json();
  const isDraft = request.nextUrl.searchParams.get('draft') === 'true';

  const schema = isDraft ? SaveDraftSchema : CreateTripProposalSchema;
  const parseResult = schema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const proposal = await tripProposalService.create(
    parseResult.data,
    session?.userId ? parseInt(session.userId, 10) : undefined
  );

  return NextResponse.json(
    {
      success: true,
      data: proposal,
      message: 'Trip proposal created successfully',
    },
    { status: 201 }
  );
});
