/**
 * GPT Store API: List Geology Tours
 *
 * Allows ChatGPT to retrieve active geology tour experiences
 * offered in the Walla Walla area.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db-helpers';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

interface TourRow {
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  duration_hours: number | null;
  price_per_person: number | null;
  highlights: string[] | null;
  what_included: string[] | null;
  is_featured: boolean;
}

interface TourResult {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  duration_hours: number | null;
  price_per_person: number | null;
  highlights: string[];
  whats_included: string[];
  is_featured: boolean;
}

// CORS headers for ChatGPT
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export const GET = withErrorHandling(async () => {
  const sql = `
    SELECT
      slug, name, tagline, description, duration_hours,
      price_per_person, highlights, what_included, is_featured
    FROM geology_tours
    WHERE is_active = true
    ORDER BY is_featured DESC, name ASC
  `;

  const result = await query<TourRow>(sql);

  // Format results for GPT-friendly response
  const tours: TourResult[] = result.rows.map(row => ({
    slug: row.slug,
    name: row.name,
    tagline: row.tagline || '',
    description: row.description,
    duration_hours: row.duration_hours,
    price_per_person: row.price_per_person,
    highlights: row.highlights || [],
    whats_included: row.what_included || [],
    is_featured: row.is_featured
  }));

  // Generate a human-friendly message
  let message: string;
  if (tours.length === 0) {
    message = 'No geology tours are currently listed. Geology tours are being developed — contact Walla Walla Travel at info@wallawalla.travel or (509) 200-8000 for the latest availability.';
  } else if (tours.length === 1) {
    message = `We offer 1 geology tour experience: "${tours[0].name}."`;
  } else {
    message = `We offer ${tours.length} geology tour experiences in the Walla Walla area.`;
  }

  return NextResponse.json(
    {
      success: true,
      message,
      tours,
      total: tours.length
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
