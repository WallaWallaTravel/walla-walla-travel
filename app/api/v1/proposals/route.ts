/**
 * Unified Proposals API - RESTful Endpoint
 *
 * GET    /api/v1/proposals - List proposals with filters
 * POST   /api/v1/proposals - Create new proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIResponse } from '@/lib/api/response';
import { validateRequest } from '@/lib/api/validate';
import { rateLimiters } from '@/lib/api/middleware';
import { proposalService, CreateProposalSchema } from '@/lib/services/proposal-service';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

// ============================================================================
// GET /api/v1/proposals - List proposals with filters
// ============================================================================

/**
 * List proposals with optional filters
 *
 * Query Params:
 * - status: Filter by status (draft, sent, viewed, accepted, declined, expired)
 * - customer_id: Filter by customer ID
 * - brand_id: Filter by brand ID
 * - start_date: Filter by tour date (from)
 * - end_date: Filter by tour date (to)
 * - include: Comma-separated relations (customer, activity)
 * - limit: Results per page (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  const { searchParams } = new URL(request.url);

  // Parse filters
  const filters = {
    status: searchParams.get('status') || undefined,
    customerId: searchParams.get('customer_id')
      ? parseInt(searchParams.get('customer_id')!, 10)
      : undefined,
    brandId: searchParams.get('brand_id')
      ? parseInt(searchParams.get('brand_id')!, 10)
      : undefined,
    startDate: searchParams.get('start_date') || undefined,
    endDate: searchParams.get('end_date') || undefined,
    includeCustomer: searchParams.get('include')?.includes('customer'),
    includeActivity: searchParams.get('include')?.includes('activity'),
    limit: searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 50,
    offset: searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : 0,
  };

  // Get proposals from service
  const result = await proposalService.findManyWithFilters(filters);

  return APIResponse.success(result.proposals, {
    total: result.total,
    limit: filters.limit,
    offset: filters.offset,
    page: Math.floor(filters.offset / filters.limit) + 1,
    pages: Math.ceil(result.total / filters.limit),
  });
});

// ============================================================================
// POST /api/v1/proposals - Create new proposal
// ============================================================================

/**
 * Create a new proposal
 */
export const POST = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  // Validate request body
  const data = await validateRequest(CreateProposalSchema, request);

  // Create proposal via service
  const proposal = await proposalService.createProposal(data);

  return APIResponse.success(proposal, {
    proposalNumber: proposal.proposal_number,
    message: 'Proposal created successfully',
  });
});
