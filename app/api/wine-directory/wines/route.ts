/**
 * Wines API
 * GET /api/wine-directory/wines - List wines
 * POST /api/wine-directory/wines - Create a wine (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { wineDirectoryService, CreateWineData } from '@/lib/services/wine-directory.service';
import { z } from 'zod';

// Schema for creating a wine
const CreateWineSchema = z.object({
  winery_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  vintage: z.number().int().min(1900).max(2100).optional(),
  varietals: z.array(z.object({
    name: z.string(),
    percentage: z.number().min(0).max(100),
  })).optional(),
  ava: z.string().max(100).optional(),
  official_tasting_notes: z.string().optional(),
  price: z.number().positive().optional(),
  alcohol_pct: z.number().min(0).max(25).optional(),
  status: z.enum(['current_release', 'library', 'sold_out', 'upcoming', 'archive']).optional(),
});

/**
 * GET /api/wine-directory/wines
 * List wines with optional filtering
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const wineryId = searchParams.get('winery_id');
  const query = searchParams.get('q');
  const featured = searchParams.get('featured');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let wines;

  if (query) {
    wines = await wineDirectoryService.searchWines(query, limit);
  } else if (featured === 'true') {
    wines = await wineDirectoryService.getFeaturedWines(limit);
  } else {
    wines = await wineDirectoryService.listWines(
      wineryId ? parseInt(wineryId, 10) : undefined,
      limit
    );
  }

  return NextResponse.json({
    success: true,
    data: wines,
    count: wines.length,
  });
});

/**
 * POST /api/wine-directory/wines
 * Create a new wine
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const data = await validateBody<CreateWineData>(request, CreateWineSchema);

  const wine = await wineDirectoryService.createWine(data);

  return NextResponse.json({
    success: true,
    data: wine,
    message: `Wine '${wine.name}' created successfully`,
  }, { status: 201 });
});




