import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { PriorityLevel, CreateCompetitorInput } from '@/types/competitors';

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

// GET - Fetch competitors with change counts
async function getHandler(request: NextRequest) {
  await verifyAdmin(request);

  const { searchParams } = new URL(request.url);
  const priority = searchParams.get('priority') as PriorityLevel | null;
  const activeOnly = searchParams.get('active_only') !== 'false';

  const competitors = await competitorMonitoringService.getCompetitors({
    priority: priority || undefined,
    activeOnly,
    includeChangeCounts: true,
  });

  return NextResponse.json({
    competitors,
    total: competitors.length,
  });
}

// POST - Add new competitor
async function postHandler(request: NextRequest) {
  const session = await verifyAdmin(request);

  const body = await request.json() as CreateCompetitorInput;

  // Validation
  if (!body.name || !body.website_url) {
    throw new BadRequestError('Name and website URL are required');
  }

  const competitor = await competitorMonitoringService.createCompetitor(
    body,
    session.user.id
  );

  return NextResponse.json({
    success: true,
    competitor,
  });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
