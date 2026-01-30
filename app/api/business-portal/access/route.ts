/**
 * Business Portal Access
 * Validates unique code and returns business info
 */

import { NextResponse } from 'next/server';
import { getBusinessByCode } from '@/lib/business-portal/business-service';
import { logger } from '@/lib/logger';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/business-portal/access
 * Validate business code and get portal access
 */
export const POST = withErrorHandling(async (request) => {
  const { code } = await request.json();

  if (!code || typeof code !== 'string') {
    logger.warn('Business portal access: invalid code type');
    throw new BadRequestError('Business code is required');
  }

  // Validate code and get business
  logger.debug('Looking up business code', { code: code.toUpperCase() });
  const business = await getBusinessByCode(code.toUpperCase());

  if (!business) {
    logger.debug('Business code not found', { code: code.toUpperCase() });
    throw new NotFoundError('Invalid business code');
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
});

