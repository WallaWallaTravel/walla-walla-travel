/**
 * Wine Directory Search API
 * GET /api/wine-directory/search - Search across wineries, wines, and events
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { wineDirectoryService } from '@/lib/services/wine-directory.service';

/**
 * GET /api/wine-directory/search
 * Full-text search across the wine directory
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!query || query.length < 2) {
    throw new BadRequestError('Search query must be at least 2 characters');
  }

  const results = await wineDirectoryService.search(query, limit);

  return NextResponse.json({
    success: true,
    query,
    data: results,
    counts: {
      wineries: results.wineries.length,
      wines: results.wines.length,
      events: results.events.length,
      total: results.wineries.length + results.wines.length + results.events.length,
    },
  });
});

