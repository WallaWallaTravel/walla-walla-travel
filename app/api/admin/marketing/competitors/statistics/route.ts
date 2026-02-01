import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

// GET - Get monitoring statistics
async function getHandler(request: NextRequest) {
  await verifyAdmin(request);

  const stats = await competitorMonitoringService.getStatistics();

  return NextResponse.json(stats);
}

export const GET = withErrorHandling(getHandler);
