/**
 * Admin: Business Directory Management
 * List businesses and get dashboard stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { businessDirectoryService, BusinessFilters } from '@/lib/services/business-directory.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/directory
 * List businesses with optional filters
 *
 * Query params:
 * - status: imported|approved|invited|active|rejected (comma-separated for multiple)
 * - type: winery|restaurant|hotel|boutique|gallery|activity|other (comma-separated)
 * - city: city name filter
 * - search: search name/address/description
 * - batch: import batch ID
 * - limit: number (default 50)
 * - offset: number (default 0)
 * - stats: true to include status/type counts
 */
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url);

  // Parse filters
  const filters: BusinessFilters = {};

  const status = searchParams.get('status');
  if (status) {
    const statuses = status.split(',');
    if (statuses.length === 1) {
      filters.status = statuses[0] as 'imported' | 'approved' | 'invited' | 'active' | 'rejected';
    } else {
      filters.status = statuses as ('imported' | 'approved' | 'invited' | 'active' | 'rejected')[];
    }
  }

  const type = searchParams.get('type');
  if (type) {
    const types = type.split(',');
    if (types.length === 1) {
      filters.business_type = types[0] as 'winery' | 'restaurant' | 'hotel' | 'boutique' | 'gallery' | 'activity' | 'catering' | 'service' | 'other';
    } else {
      filters.business_type = types as ('winery' | 'restaurant' | 'hotel' | 'boutique' | 'gallery' | 'activity' | 'catering' | 'service' | 'other')[];
    }
  }

  if (searchParams.get('city')) {
    filters.city = searchParams.get('city')!;
  }

  if (searchParams.get('search')) {
    filters.search = searchParams.get('search')!;
  }

  if (searchParams.get('batch')) {
    filters.import_batch_id = searchParams.get('batch')!;
  }

  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const includeStats = searchParams.get('stats') === 'true';

  // Get businesses
  const { businesses, total } = await businessDirectoryService.getAll(filters, { limit, offset });

  // Optionally include stats
  let stats = undefined;
  if (includeStats) {
    const [statusCounts, typeCounts] = await Promise.all([
      businessDirectoryService.getStatusCounts(),
      businessDirectoryService.getTypeCounts(),
    ]);
    stats = { byStatus: statusCounts, byType: typeCounts };
  }

  return NextResponse.json({
    success: true,
    businesses,
    total,
    limit,
    offset,
    hasMore: offset + businesses.length < total,
    ...(stats && { stats }),
    timestamp: new Date().toISOString(),
  });
});
