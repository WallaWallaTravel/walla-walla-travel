import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { query } from '@/lib/db';

/**
 * GET /api/admin/drafts/summary
 * Returns aggregate counts for draft proposals by age.
 */
export const GET = withAdminAuth(async (_request: NextRequest) => {
  const result = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent,
      COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '7 days' AND created_at > NOW() - INTERVAL '30 days') as aging,
      COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '30 days') as stale
    FROM trip_proposals
    WHERE status = 'draft'
  `);

  const row = result.rows[0] || { total: 0, recent: 0, aging: 0, stale: 0 };

  return NextResponse.json({
    success: true,
    data: {
      total: parseInt(row.total) || 0,
      recent: parseInt(row.recent) || 0,
      aging: parseInt(row.aging) || 0,
      stale: parseInt(row.stale) || 0,
    },
  });
});
