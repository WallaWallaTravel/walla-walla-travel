/**
 * Corporate Request Conversion API
 * Convert corporate request to proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { convertCorporateRequestToProposal, ensureProposalColumns } from '@/lib/corporate/proposal-converter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/corporate-request/convert
 * Convert a corporate request to a proposal
 */
export async function POST(request: NextRequest) {
  try {
    const { requestId } = await request.json();
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      );
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
    
  } catch (error) {
    logger.error('Convert API error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to convert corporate request', details: message },
      { status: 500 }
    );
  }
}

