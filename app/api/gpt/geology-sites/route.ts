/**
 * GPT Store API: Search Geology Sites
 *
 * Allows ChatGPT to search for geological sites and viewpoints
 * in the Walla Walla area that visitors can explore.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

interface SiteRow {
  slug: string;
  name: string;
  description: string | null;
  site_type: string | null;
  address: string | null;
  is_public_access: boolean;
  requires_appointment: boolean;
  best_time_to_visit: string | null;
}

interface SiteResult {
  slug: string;
  name: string;
  description: string;
  site_type: string;
  address: string;
  is_public_access: boolean;
  requires_appointment: boolean;
  best_time_to_visit: string;
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
  const siteType = searchParams.get('type') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25);

  // Build the query
  let sql = `
    SELECT
      slug, name, description, site_type, address,
      is_public_access, requires_appointment, best_time_to_visit
    FROM geology_sites
    WHERE is_published = true
  `;
  const params: (string | number)[] = [];
  let paramIndex = 1;

  // Add search filter
  if (searchQuery) {
    sql += ` AND (
      name ILIKE $${paramIndex} OR
      description ILIKE $${paramIndex}
    )`;
    params.push(`%${searchQuery}%`);
    paramIndex++;
  }

  // Add site type filter
  if (siteType) {
    sql += ` AND site_type = $${paramIndex}`;
    params.push(siteType);
    paramIndex++;
  }

  sql += ` ORDER BY name ASC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query<SiteRow>(sql, params);

  // Format results for GPT-friendly response
  const sites: SiteResult[] = result.rows.map(row => ({
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    site_type: row.site_type || 'formation',
    address: row.address || 'Walla Walla area',
    is_public_access: row.is_public_access,
    requires_appointment: row.requires_appointment,
    best_time_to_visit: row.best_time_to_visit || 'Spring through fall'
  }));

  // Generate a human-friendly message
  let message: string;
  if (sites.length === 0) {
    if (searchQuery) {
      message = `I couldn't find any geological sites matching "${searchQuery}". Try searching for "viewpoint", "basalt", "formation", or "vineyard" — or browse all sites.`;
    } else if (siteType) {
      message = `No published ${siteType.replace(/_/g, ' ')} sites found. The geology sites database is still being developed — use your knowledge file for site recommendations.`;
    } else {
      message = 'No geology sites are listed yet. The site database is being developed. Use your knowledge file to recommend geological points of interest in the meantime.';
    }
  } else if (searchQuery) {
    message = `Found ${sites.length} geological ${sites.length === 1 ? 'site' : 'sites'} matching "${searchQuery}" in the Walla Walla area.`;
  } else if (siteType) {
    message = `Found ${sites.length} ${siteType.replace(/_/g, ' ')} ${sites.length === 1 ? 'site' : 'sites'} in the Walla Walla area.`;
  } else {
    message = `Here are ${sites.length} geological sites you can visit in the Walla Walla area.`;
  }

  return NextResponse.json(
    {
      success: true,
      message,
      sites,
      total: sites.length
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
