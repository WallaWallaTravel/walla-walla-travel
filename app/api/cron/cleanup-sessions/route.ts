/**
 * Cron: Cleanup old sessions
 * Deletes user_sessions rows older than 30 days (table hygiene).
 *
 * Schedule: daily (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';
import { sessionStoreService } from '@/lib/services/session-store.service';

export const dynamic = 'force-dynamic';

export const GET = withCronAuth('cleanup-sessions', async (_request: NextRequest) => {
  const deletedCount = await sessionStoreService.cleanupOldSessions();

  return NextResponse.json({
    success: true,
    deletedCount,
    timestamp: new Date().toISOString(),
  });
});

// Support POST for manual triggering
export const POST = GET;
