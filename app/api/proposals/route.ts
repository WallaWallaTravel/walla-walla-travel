/**
 * Proposals API
 * 
 * ✅ REFACTORED: Service layer handles business logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { proposalService } from '@/lib/services/proposal.service';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

/**
 * GET /api/proposals
 * List all proposals (admin)
 * 
 * ✅ REFACTORED: Service layer
 */
export const GET = withRateLimit(rateLimiters.public)(
  withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);

    const result = await proposalService.list({
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });

    return NextResponse.json({
      success: true,
      data: result.proposals,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  }));

/**
 * POST /api/proposals
 * Create new proposal
 *
 * ✅ REFACTORED: Service layer handles validation & creation
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (request: NextRequest) => {
  const data = await request.json();

  const proposal = await proposalService.create(data);

  return NextResponse.json({
    success: true,
    data: proposal,
    message: 'Proposal created successfully',
    timestamp: new Date().toISOString(),
  }, { status: 201 });
})));
