/**
 * Business Search API
 * Search businesses for AI Travel Guide
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { searchBusinesses, formatBusinessForAI } from '@/lib/business-portal/business-knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/travel-guide/search-businesses
 * Search businesses by criteria
 */
export async function POST(request: NextRequest) {
  try {
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
    
  } catch (error) {
    logger.error('Business search error', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Search failed', details: message },
      { status: 500 }
    );
  }
}

