import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { logger } from '@/lib/logger';
import { wineryAIService, WineryFilters } from '@/lib/services/winery-ai.service';
import { wineryService, WinerySummary } from '@/lib/services/winery.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/wineries/recommend
 *
 * AI-powered winery recommendation endpoint
 * - Extracts filters from natural language query
 * - Applies filters to winery database
 * - Returns matching wineries with explanations
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();

  const { query, includeExplanations = true } = await request.json();

  if (!query || typeof query !== 'string') {
    throw new BadRequestError('Query is required');
  }

  // Validate query length
  if (query.length > 500) {
    throw new BadRequestError('Query too long (max 500 characters)');
  }

  logger.info('Winery recommendation request', { query: query.substring(0, 100) });

  // Step 1: Extract filters from natural language query
  const recommendation = await wineryAIService.extractFilters(query);

  logger.info('Filters extracted', {
    filters: recommendation.filters,
    confidence: recommendation.confidence,
  });

  // Step 2: Get all wineries and apply filters
  const allWineries = await wineryService.getVerified();
  const filteredWineries = applyFilters(allWineries, recommendation.filters);

  logger.info('Wineries filtered', {
    total: allWineries.length,
    filtered: filteredWineries.length,
  });

  // Step 3: Optionally generate match explanations
  let explanations = null;
  if (includeExplanations && filteredWineries.length > 0 && filteredWineries.length <= 20) {
    explanations = await wineryAIService.explainMatches(
      query,
      recommendation.filters,
      filteredWineries.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        wine_styles: w.wine_styles,
        features: w.features,
        experience_tags: w.experience_tags,
        tasting_fee: w.tasting_fee,
        region: w.region,
      }))
    );
  }

  const duration = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    query,
    recommendation: {
      filters: recommendation.filters,
      explanation: recommendation.explanation,
      followUpSuggestions: recommendation.followUpSuggestions,
      confidence: recommendation.confidence,
    },
    results: {
      total: filteredWineries.length,
      wineries: filteredWineries.slice(0, 20), // Limit to 20 results
      explanations,
    },
    duration,
  });
});

/**
 * Apply extracted filters to winery list
 */
function applyFilters(wineries: WinerySummary[], filters: WineryFilters): WinerySummary[] {
  return wineries.filter((winery) => {
    // Region filter
    if (filters.region) {
      if (!winery.region?.toLowerCase().includes(filters.region.toLowerCase())) {
        return false;
      }
    }

    // Fee bucket filter
    if (filters.fee_bucket) {
      const fee = winery.tasting_fee || 0;
      switch (filters.fee_bucket) {
        case 'free':
          if (fee !== 0) return false;
          break;
        case 'under20':
          if (fee <= 0 || fee >= 20) return false;
          break;
        case '20-40':
          if (fee < 20 || fee > 40) return false;
          break;
        case 'over40':
          if (fee <= 40) return false;
          break;
      }
    }

    // Max tasting fee filter
    if (filters.max_tasting_fee !== undefined) {
      if ((winery.tasting_fee || 0) > filters.max_tasting_fee) {
        return false;
      }
    }

    // Reservation required filter
    if (filters.reservation_required !== undefined) {
      if (winery.reservation_required !== filters.reservation_required) {
        return false;
      }
    }

    // Experience tags filter (ANY match)
    if (filters.experience_tags && filters.experience_tags.length > 0) {
      const wineryTags = winery.experience_tags || [];
      if (!filters.experience_tags.some((tag) => wineryTags.includes(tag))) {
        return false;
      }
    }

    // Amenities filter (ANY match - partial match OK)
    if (filters.amenities && filters.amenities.length > 0) {
      const wineryFeatures = winery.features || [];
      const hasAnyAmenity = filters.amenities.some((amenity) =>
        wineryFeatures.some((f) => f.toLowerCase().includes(amenity.toLowerCase()))
      );
      if (!hasAnyAmenity) {
        return false;
      }
    }

    // Wine styles filter (ANY match)
    if (filters.wine_styles && filters.wine_styles.length > 0) {
      const wineryStyles = winery.wine_styles || [];
      const hasAnyStyle = filters.wine_styles.some((style) =>
        wineryStyles.some((ws) => ws.toLowerCase().includes(style.toLowerCase()))
      );
      if (!hasAnyStyle) {
        return false;
      }
    }

    // Min group size filter
    if (filters.min_group_size !== undefined) {
      const maxGroup = winery.max_group_size || 14; // Default assumption
      if (maxGroup < filters.min_group_size) {
        return false;
      }
    }

    // Search query filter (name, description, wine styles)
    if (filters.search_query) {
      const query = filters.search_query.toLowerCase();
      const searchable = [
        winery.name,
        winery.description,
        winery.region,
        ...(winery.wine_styles || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(query)) {
        return false;
      }
    }

    return true;
  });
}
