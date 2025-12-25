/**
 * Complete Winery Data API
 * GET /api/wine-directory/wineries/[winery_id]/complete - Get winery with all related data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { wineDirectoryService } from '@/lib/services/wine-directory.service';

interface RouteParams {
  params: Promise<{ winery_id: string }>;
}

/**
 * GET /api/wine-directory/wineries/[winery_id]/complete
 * Get complete winery data including wines, content, people, FAQs, and events
 */
export const GET = withErrorHandling(async (
  _request: NextRequest,
  { params }: RouteParams
) => {
  const { winery_id } = await params;
  const wineryId = parseInt(winery_id, 10);

  const data = await wineDirectoryService.getWineryComplete(wineryId);

  return NextResponse.json({
    success: true,
    data,
  });
});







