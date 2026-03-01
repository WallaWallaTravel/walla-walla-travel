/**
 * Admin API: Process Business Portal Jobs
 * Manually trigger processing of queued jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { processJobs } from '@/lib/business-portal/processing-worker';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for processing

/**
 * POST /api/admin/business-portal/process-jobs
 * Trigger processing of pending jobs
 */
export const POST = withAdminAuth(async (_request: NextRequest, _session) => {
  logger.info('Starting job processing');

  const result = await processJobs(50); // Process up to 50 jobs

  return NextResponse.json({
    success: true,
    ...result,
    message: `Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`
  });
});

/**
 * GET /api/admin/business-portal/process-jobs
 * Get processing status
 */
export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
  const { query } = await import('@/lib/db');

  // Get job stats
  const result = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'processing') as processing,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM processing_jobs
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `);

  const stats = result.rows[0];

  return NextResponse.json({
    success: true,
    stats: {
      pending: parseInt(stats.pending || '0'),
      processing: parseInt(stats.processing || '0'),
      completed: parseInt(stats.completed || '0'),
      failed: parseInt(stats.failed || '0')
    }
  });
});
