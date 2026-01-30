/**
 * Business Search API
 * Search businesses for AI Travel Guide
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { logger } from '@/lib/logger';
import { searchBusinesses, formatBusinessForAI } from '@/lib/business-portal/business-knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/travel-guide/search-businesses
 * Search businesses by criteria
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { business_type, tags, amenities, best_for, query } = body;

  logger.debug('Business search query', { business_type, tags, amenities, best_for, query });

  const businesses = await searchBusinesses({
    business_type,
    tags,
    amenities,
    best_for,
    query
  });

  logger.debug('Business search results', { count: businesses.length });

  // Format for AI context
  const formattedBusinesses = businesses.map(b => ({
    id: b.id,
    name: b.name,
    business_type: b.business_type,
    summary: formatBusinessForAI(b),
    best_for: b.best_for,
    amenities: b.amenities,
    tags: b.all_tags
  }));

  return NextResponse.json({
    success: true,
    count: businesses.length,
    businesses: formattedBusinesses
  });
});

