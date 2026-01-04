import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { addCacheHeaders, CachePresets } from '@/lib/api/middleware/cache';
import { logger } from '@/lib/logger';

/**
 * GET /api/announcements
 * Public endpoint - returns active announcements
 * Cached for 5 minutes with stale-while-revalidate
 *
 * Query params:
 *   - position: 'top' | 'homepage' | 'booking' (optional, defaults to all)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position');

    // Build query for active announcements
    // Active means: is_active = true AND (starts_at is null OR starts_at <= now) AND (expires_at is null OR expires_at > now)
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

    const result = await query(sql, params);

    const response = NextResponse.json({
      success: true,
      announcements: result.rows,
      count: result.rows.length,
    });

    // Cache announcements for 5 minutes (frequently checked, semi-static)
    return addCacheHeaders(response, CachePresets.MEDIUM);
  } catch (error) {
    logger.error('Failed to fetch announcements', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}
