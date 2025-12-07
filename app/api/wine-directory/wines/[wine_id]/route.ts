/**
 * Wine Detail API
 * GET /api/wine-directory/wines/[wine_id] - Get wine details
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { wineDirectoryService } from '@/lib/services/wine-directory.service';

interface RouteParams {
  params: Promise<{ wine_id: string }>;
}

/**
 * GET /api/wine-directory/wines/[wine_id]
 * Get wine details
 */
export const GET = withErrorHandling(async (
  _request: NextRequest,
  { params }: RouteParams
) => {
  const { wine_id } = await params;
  const wineId = parseInt(wine_id, 10);

  const wine = await wineDirectoryService.getWineById(wineId);

  return NextResponse.json({
    success: true,
    data: wine,
  });
});

