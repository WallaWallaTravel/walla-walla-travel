import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addCacheHeaders, CachePresets } from '@/lib/api/middleware/cache';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { logger } from '@/lib/logger';

/**
 * GET /api/announcements
 * Public endpoint - returns active announcements
 * Cached for 5 minutes with stale-while-revalidate
 *
 * Query params:
 *   - position: 'top' | 'homepage' | 'booking' (optional, defaults to all)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const position = searchParams.get('position');

  let sql = `
    SELECT id, title, message, link_text, link_url, type, position, background_color
    FROM announcements
    WHERE is_active = true
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (expires_at IS NULL OR expires_at > NOW())
  `;
  const params: (string | null)[] = [];

  if (position) {
    params.push(position);
    sql += ` AND position = $${params.length}`;
  }

  sql += ` ORDER BY created_at DESC`;

  let rows: Record<string, unknown>[] = [];

  try {
    const result = await prisma.$queryRawUnsafe(sql, ...params) as Record<string, unknown>[];
    rows = result;
  } catch (err: unknown) {
    // PostgreSQL error code 42P01 = "relation does not exist"
    // Return empty results instead of 500 — the table may not be migrated yet
    const pgCode = (err as { code?: string }).code;
    if (pgCode === '42P01') {
      logger.warn('[Announcements] Table does not exist — migration 044 may not be applied');
    } else {
      throw err;
    }
  }

  const response = NextResponse.json({
    success: true,
    announcements: rows,
    count: rows.length,
  });

  // Cache announcements for 5 minutes (frequently checked, semi-static)
  return addCacheHeaders(response, CachePresets.MEDIUM);
});
