/**
 * GPT Store API: Search Wineries
 *
 * Allows ChatGPT to search for wineries in Walla Walla Valley
 * Returns results in a natural language-friendly format
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

interface WineryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  tasting_fee: number | null;
  average_visit_duration: number | null;
  website: string | null;
  reservation_required: boolean;
  specialties: string[] | null;
  features: string[] | null;
  is_active: boolean;
}

interface WineryResult {
  id: number;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  tasting_fee: number | null;
  average_visit_duration: number;
  website: string | null;
  reservation_required: boolean;
  specialties: string[];
  features: string[];
}

// CORS headers for ChatGPT
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('query') || '';
  const style = searchParams.get('style') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25);

  // Build the query
  let sql = `
    SELECT
      id, name, slug, description, address, city,
      tasting_fee, average_visit_duration, website,
      reservation_required, specialties, features, is_active
    FROM wineries
    WHERE is_active = true
  `;
  const params: (string | number)[] = [];
  let paramIndex = 1;

  // Add search filter if provided
  if (searchQuery) {
    sql += ` AND (
      name ILIKE $${paramIndex} OR
      description ILIKE $${paramIndex} OR
      $${paramIndex + 1} = ANY(specialties) OR
      $${paramIndex + 1} = ANY(features)
    )`;
    params.push(`%${searchQuery}%`, searchQuery.toLowerCase());
    paramIndex += 2;
  }

  // Add style filter
  if (style) {
    const styleKeywords: Record<string, string[]> = {
      'red': ['Cabernet', 'Merlot', 'Syrah', 'Red Blend', 'Malbec'],
      'white': ['Chardonnay', 'Riesling', 'Viognier', 'Sauvignon Blanc'],
      'mixed': [],
      'sparkling': ['Sparkling', 'Champagne']
    };

    const keywords = styleKeywords[style] || [];
    if (keywords.length > 0) {
      sql += ` AND (`;
      const conditions: string[] = [];
      for (const keyword of keywords) {
        conditions.push(`$${paramIndex} = ANY(specialties)`);
        params.push(keyword);
        paramIndex++;
      }
      sql += conditions.join(' OR ');
      sql += `)`;
    }
  }

  sql += ` ORDER BY name ASC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query<WineryRow>(sql, params);

  // Format results for GPT-friendly response
  const wineries: WineryResult[] = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || 'A wonderful winery in Walla Walla Valley.',
    address: row.address || 'Walla Walla, WA',
    city: row.city || 'Walla Walla',
    tasting_fee: row.tasting_fee,
    average_visit_duration: row.average_visit_duration || 60,
    website: row.website,
    reservation_required: row.reservation_required,
    specialties: row.specialties || [],
    features: row.features || []
  }));

  // Generate a human-friendly message
  let message: string;
  if (wineries.length === 0) {
    message = searchQuery
      ? `I couldn't find any wineries matching "${searchQuery}". Try searching for specific wine types like "Cabernet" or "Syrah", or browse all wineries.`
      : 'No wineries are currently available. Please try again later.';
  } else if (searchQuery) {
    message = `Found ${wineries.length} ${wineries.length === 1 ? 'winery' : 'wineries'} matching "${searchQuery}". ${wineries.slice(0, 3).map(w => w.name).join(', ')}${wineries.length > 3 ? ' and more' : ''}.`;
  } else {
    message = `Here are ${wineries.length} wineries in Walla Walla Valley. The region is known for exceptional Cabernet Sauvignon, Syrah, and Merlot.`;
  }

  return NextResponse.json(
    {
      success: true,
      message,
      wineries,
      total: wineries.length
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
