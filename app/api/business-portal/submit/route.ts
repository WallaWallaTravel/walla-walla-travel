/**
 * Business Portal Submit
 * Mark business submission as complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  submitBusiness,
  getBusinessStats
} from '@/lib/business-portal/business-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/business-portal/submit
 * Submit business profile for review
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json();
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      );
    }
    
    // Get completion stats
    const stats = await getBusinessStats(businessId);
    
    // Check if minimum requirements met
    if (stats.completionPercentage < 50) {
      return NextResponse.json(
        { 
          error: 'Please answer more questions before submitting',
          completionPercentage: stats.completionPercentage,
          minRequired: 50
        },
        { status: 400 }
      );
    }
    
    // Submit business
    await submitBusiness(businessId);
    
    return NextResponse.json({
      success: true,
      message: 'Submission complete! We\'ll review your profile and be in touch soon.',
      completionPercentage: stats.completionPercentage
    });
    
  } catch (error) {
    logger.error('Business Submit error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to submit', details: message },
      { status: 500 }
    );
  }
}

