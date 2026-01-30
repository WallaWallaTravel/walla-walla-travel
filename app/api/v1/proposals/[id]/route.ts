/**
 * Unified Proposal Resource API - Individual Proposal
 *
 * GET    /api/v1/proposals/:id - Get proposal details
 * PATCH  /api/v1/proposals/:id - Update proposal
 * DELETE /api/v1/proposals/:id - Delete/decline proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIResponse } from '@/lib/api/response';
import { validateRequest } from '@/lib/api/validate';
import { rateLimiters } from '@/lib/api/middleware';
import { proposalService } from '@/lib/services/proposal-service';
import { withErrorHandling, BadRequestError, RouteContext } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

// ============================================================================
// GET /api/v1/proposals/:id - Get proposal details
// ============================================================================

export const GET = withErrorHandling<unknown, { id: string }>(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.public(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;

  // Get full proposal details
  const proposal = await proposalService.getFullProposalDetails(id);

  if (!proposal) {
    return APIResponse.notFound('Proposal', id);
  }

  return APIResponse.success(proposal);
});

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

export const PATCH = withErrorHandling<unknown, { id: string }>(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;

  // Validate ID is numeric
  const proposalId = parseInt(id, 10);
  if (isNaN(proposalId)) {
    throw new BadRequestError('Proposal ID must be numeric for updates', 'INVALID_ID');
  }

  // Validate request body
  const data = await validateRequest(UpdateProposalSchema, request);

  // Update proposal
  const updatedProposal = await proposalService.updateProposal(proposalId, data);

  return APIResponse.success(updatedProposal, {
    message: 'Proposal updated successfully',
  });
});

// ============================================================================
// DELETE /api/v1/proposals/:id - Decline proposal
// ============================================================================

export const DELETE = withErrorHandling<unknown, { id: string }>(async (
  request: NextRequest,
  context: RouteContext<{ id: string }>
): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = await rateLimiters.authenticated(request);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await context.params;

  // Validate ID is numeric
  const proposalId = parseInt(id, 10);
  if (isNaN(proposalId)) {
    throw new BadRequestError('Proposal ID must be numeric', 'INVALID_ID');
  }

  // Mark as declined
  const declinedProposal = await proposalService.updateStatus(proposalId, 'declined');

  return APIResponse.success(declinedProposal, {
    message: 'Proposal declined successfully',
  });
});
