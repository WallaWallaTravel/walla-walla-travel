/**
 * GPT Store API: Search Business Directory
 *
 * Allows ChatGPT to search for non-winery partner businesses in Walla Walla
 * (restaurants, hotels, boutiques, galleries, activities).
 * Only returns businesses with status = 'active' (claimed partner listings).
 * Auto-updates as new partners register and go active.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

interface BusinessRow {
  id: number;
  name: string;
  business_type: string;
  short_description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
}

interface BusinessResult {
  name: string;
  business_type: string;
  short_description: string;
  address: string;
  city: string;
  phone: string | null;
  website: string | null;
}

// CORS headers for ChatGPT
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const VALID_TYPES = ['restaurant', 'hotel', 'boutique', 'gallery', 'activity', 'catering', 'service', 'other'];

const TYPE_LABELS: Record<string, { singular: string; plural: string }> = {
  restaurant: { singular: 'restaurant', plural: 'restaurants' },
  hotel: { singular: 'hotel', plural: 'hotels' },
  boutique: { singular: 'boutique', plural: 'boutiques' },
  gallery: { singular: 'gallery', plural: 'galleries' },
  activity: { singular: 'activity', plural: 'activities' },
  catering: { singular: 'caterer', plural: 'caterers' },
  service: { singular: 'service provider', plural: 'service providers' },
  other: { singular: 'business', plural: 'businesses' },
};

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('query') || '';
  const type = searchParams.get('type') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10) || 10, 25);

  // Build the query
  let sql = `
    SELECT
      id, name, business_type, short_description,
      address, city, phone, website
    FROM businesses
    WHERE status = 'active'
      AND business_type != 'winery'
  `;
  const params: (string | number)[] = [];
  let paramIndex = 1;

  // Filter by business type if provided (uses array overlap)
  if (type && VALID_TYPES.includes(type)) {
    sql += ` AND $${paramIndex} = ANY(business_types)`;
    params.push(type);
    paramIndex++;
  }

  // Add text search if provided
  if (searchQuery) {
    sql += ` AND (
      name ILIKE $${paramIndex} OR
      short_description ILIKE $${paramIndex}
    )`;
    params.push(`%${searchQuery}%`);
    paramIndex++;
  }

  sql += ` ORDER BY name ASC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query<BusinessRow>(sql, params);

  // Format results for GPT-friendly response
  const businesses: BusinessResult[] = result.rows.map(row => ({
    name: row.name,
    business_type: row.business_type,
    short_description: row.short_description || 'A local Walla Walla business.',
    address: row.address || 'Walla Walla, WA',
    city: row.city || 'Walla Walla',
    phone: row.phone,
    website: row.website
  }));

  // Generate a human-friendly message
  const labels = type ? TYPE_LABELS[type] || { singular: 'business', plural: 'businesses' } : { singular: 'business', plural: 'businesses' };
  const typeLabel = businesses.length === 1 ? labels.singular : labels.plural;
  let message: string;
  if (businesses.length === 0) {
    message = searchQuery
      ? `I couldn't find any ${labels.plural} matching "${searchQuery}". Try a different search term or browse all categories.`
      : `No ${labels.plural} are currently listed in our directory. New partners are added regularly — check back soon!`;
  } else if (searchQuery) {
    message = `Found ${businesses.length} ${typeLabel} matching "${searchQuery}".`;
  } else {
    message = `Here are ${businesses.length} ${typeLabel} in the Walla Walla area.`;
  }

  return NextResponse.json(
    {
      success: true,
      message,
      businesses,
      total: businesses.length
    },
    { headers: corsHeaders }
  );
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}
