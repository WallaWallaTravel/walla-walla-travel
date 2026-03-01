import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { PriorityLevel, CreateCompetitorInput } from '@/types/competitors';

// GET - Fetch competitors with change counts
async function getHandler(request: NextRequest) {
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
async function postHandler(request: NextRequest, session: AuthSession) {
  const body = await request.json() as CreateCompetitorInput;

  // Validation
  if (!body.name || !body.website_url) {
    throw new BadRequestError('Name and website URL are required');
  }

  const competitor = await competitorMonitoringService.createCompetitor(
    body,
    parseInt(session.userId)
  );

  return NextResponse.json({
    success: true,
    competitor,
  });
}

export const GET = withAdminAuth(async (request, _session) => getHandler(request));
export const POST = withAdminAuth(async (request, session) => postHandler(request, session));
