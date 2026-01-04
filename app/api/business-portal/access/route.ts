/**
 * Business Portal Access
 * Validates unique code and returns business info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBusinessByCode } from '@/lib/business-portal/business-service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/business-portal/access
 * Validate business code and get portal access
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      logger.warn('Business portal access: invalid code type');
      return NextResponse.json(
        { error: 'Business code is required' },
        { status: 400 }
      );
    }

    // Validate code and get business
    logger.debug('Looking up business code', { code: code.toUpperCase() });
    const business = await getBusinessByCode(code.toUpperCase());

    if (!business) {
      logger.debug('Business code not found', { code: code.toUpperCase() });
      return NextResponse.json(
        { error: 'Invalid business code' },
        { status: 404 }
      );
    }

    logger.info('Business portal access granted', { businessId: business.id, businessName: business.name });

    // Return business info (excluding sensitive data)
    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        business_type: business.business_type,
        status: business.status,
        completion_percentage: business.completion_percentage,
        contact_email: business.contact_email,
        unique_code: business.unique_code
      }
    });

  } catch (error) {
    logger.error('Business portal access error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to validate code', details: message },
      { status: 500 }
    );
  }
}

