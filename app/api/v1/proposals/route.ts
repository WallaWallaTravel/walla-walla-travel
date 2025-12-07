/**
 * Unified Proposals API - RESTful Endpoint
 * 
 * GET    /api/v1/proposals - List proposals with filters
 * POST   /api/v1/proposals - Create new proposal
 */

import { NextRequest } from 'next/server';
import { APIResponse } from '@/lib/api/response';
import { validateRequest, ValidationError } from '@/lib/api/validate';
import { withMiddleware, rateLimiters } from '@/lib/api/middleware';
import { proposalService, CreateProposalSchema } from '@/lib/services/proposal-service';
import { ServiceError } from '@/lib/api/middleware/error-handler';

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
export const GET = withMiddleware(
  async (request: NextRequest) => {
    try {
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

    } catch (error) {
      if (error instanceof ServiceError) {
        return APIResponse.error({
          code: error.code,
          message: error.message,
          details: error.details,
        }, 400);
      }

      return APIResponse.internalError(
        'Failed to fetch proposals',
        error instanceof Error ? error.message : undefined
      );
    }
  },
  rateLimiters.authenticated
);

// ============================================================================
// POST /api/v1/proposals - Create new proposal
// ============================================================================

/**
 * Create a new proposal
 */
export const POST = withMiddleware(
  async (request: NextRequest) => {
    try {
      // Validate request body
      const data = await validateRequest(CreateProposalSchema, request);

      // Create proposal via service
      const proposal = await proposalService.createProposal(data);

      return APIResponse.success(proposal, {
        proposalNumber: proposal.proposal_number,
        message: 'Proposal created successfully',
      });

    } catch (error) {
      if (error instanceof ValidationError) {
        return APIResponse.validation(error.errors);
      }

      if (error instanceof ServiceError) {
        return APIResponse.error({
          code: error.code,
          message: error.message,
          details: error.details,
        }, 400);
      }

      return APIResponse.internalError(
        'Failed to create proposal',
        error instanceof Error ? error.message : undefined
      );
    }
  },
  rateLimiters.authenticated
);


