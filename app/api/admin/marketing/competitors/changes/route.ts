import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { ChangeStatus } from '@/types/competitors';

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

// GET - Get all recent changes
async function getHandler(request: NextRequest) {
  await verifyAdmin(request);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as ChangeStatus | null;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const { changes, total } = await competitorMonitoringService.getAllRecentChanges({
    status: status || undefined,
    limit,
    offset,
  });

  const unreviewedCount = await competitorMonitoringService.getUnreviewedCount();

  return NextResponse.json({
    changes,
    total,
    unreviewed_count: unreviewedCount,
    limit,
    offset,
    has_more: offset + changes.length < total,
  });
}

export const GET = withErrorHandling(getHandler);
