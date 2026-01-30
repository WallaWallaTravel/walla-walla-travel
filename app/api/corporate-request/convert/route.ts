/**
 * Corporate Request Conversion API
 * Convert corporate request to proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { convertCorporateRequestToProposal, ensureProposalColumns } from '@/lib/corporate/proposal-converter';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/corporate-request/convert
 * Convert a corporate request to a proposal
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { requestId } = await request.json();

  if (!requestId) {
    throw new BadRequestError('requestId is required');
  }

  // Ensure proposal table has needed columns
  await ensureProposalColumns();

  // Convert to proposal
  logger.info('Converting corporate request', { requestId });
  const result = await convertCorporateRequestToProposal(requestId);

  logger.info('Conversion successful', { proposalNumber: result.proposalNumber });

  return NextResponse.json({
    success: true,
    ...result,
    message: 'Corporate request converted to proposal successfully'
  });
});
