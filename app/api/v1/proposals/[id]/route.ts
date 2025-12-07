/**
 * Unified Proposal Resource API - Individual Proposal
 * 
 * GET    /api/v1/proposals/:id - Get proposal details
 * PATCH  /api/v1/proposals/:id - Update proposal
 * DELETE /api/v1/proposals/:id - Delete/decline proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIResponse } from '@/lib/api/response';
import { validateRequest, ValidationError } from '@/lib/api/validate';
import { withMiddleware, rateLimiters } from '@/lib/api/middleware';
import { proposalService } from '@/lib/services/proposal-service';
import { ServiceError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

// ============================================================================
// GET /api/v1/proposals/:id - Get proposal details
// ============================================================================

export const GET = withMiddleware(
  async (
    request: NextRequest,
    context?: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    const resolvedParams = await (context?.params ?? Promise.resolve({ id: '' }));
    const { id } = resolvedParams;
    try {
      // Get full proposal details
      const proposal = await proposalService.getFullProposalDetails(id);

      if (!proposal) {
        return APIResponse.notFound('Proposal', id);
      }

      return APIResponse.success(proposal);

    } catch (error) {
      if (error instanceof NotFoundError) {
        return APIResponse.notFound('Proposal', id);
      }

      if (error instanceof ServiceError) {
        return APIResponse.error({
          code: error.code,
          message: error.message,
          details: error.details,
        }, 400);
      }

      return APIResponse.internalError(
        'Failed to fetch proposal',
        error instanceof Error ? error.message : undefined
      );
    }
  },
  rateLimiters.public
);

// ============================================================================
// PATCH /api/v1/proposals/:id - Update proposal
// ============================================================================

const UpdateProposalSchema = z.object({
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired']).optional(),
  partySize: z.number().int().min(1).max(50).optional(),
  tourDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  durationHours: z.number().min(4).max(24).optional(),
  subtotal: z.number().min(0).optional(),
  taxes: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const PATCH = withMiddleware(
  async (
    request: NextRequest,
    context?: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    const resolvedParams = await (context?.params ?? Promise.resolve({ id: '' }));
    const { id } = resolvedParams;
    try {

      // Validate ID is numeric
      const proposalId = parseInt(id, 10);
      if (isNaN(proposalId)) {
        return APIResponse.error({
          code: 'INVALID_ID',
          message: 'Proposal ID must be numeric for updates',
        }, 400);
      }

      // Validate request body
      const data = await validateRequest(UpdateProposalSchema, request);

      // Update proposal
      const updatedProposal = await proposalService.updateProposal(proposalId, data);

      return APIResponse.success(updatedProposal, {
        message: 'Proposal updated successfully',
      });

    } catch (error) {
      if (error instanceof ValidationError) {
        return APIResponse.validation(error.errors);
      }

      if (error instanceof NotFoundError) {
        return APIResponse.notFound('Proposal', id);
      }

      if (error instanceof ServiceError) {
        return APIResponse.error({
          code: error.code,
          message: error.message,
          details: error.details,
        }, 400);
      }

      return APIResponse.internalError(
        'Failed to update proposal',
        error instanceof Error ? error.message : undefined
      );
    }
  },
  rateLimiters.authenticated
);

// ============================================================================
// DELETE /api/v1/proposals/:id - Decline proposal
// ============================================================================

export const DELETE = withMiddleware(
  async (
    request: NextRequest,
    context?: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    const resolvedParams = await (context?.params ?? Promise.resolve({ id: '' }));
    const { id } = resolvedParams;
    try {

      // Validate ID is numeric
      const proposalId = parseInt(id, 10);
      if (isNaN(proposalId)) {
        return APIResponse.error({
          code: 'INVALID_ID',
          message: 'Proposal ID must be numeric',
        }, 400);
      }

      // Mark as declined
      const declinedProposal = await proposalService.updateStatus(proposalId, 'declined');

      return APIResponse.success(declinedProposal, {
        message: 'Proposal declined successfully',
      });

    } catch (error) {
      if (error instanceof NotFoundError) {
        return APIResponse.notFound('Proposal', id);
      }

      if (error instanceof ServiceError) {
        return APIResponse.error({
          code: error.code,
          message: error.message,
          details: error.details,
        }, 400);
      }

      return APIResponse.internalError(
        'Failed to decline proposal',
        error instanceof Error ? error.message : undefined
      );
    }
  },
  rateLimiters.authenticated
);


