import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import type { AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { CreateSwotInput } from '@/types/competitors';

function getCompetitorIdFromUrl(request: NextRequest): number {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  // URL is /api/admin/marketing/competitors/[id]/swot
  const idIndex = segments.indexOf('competitors') + 1;
  const id = parseInt(segments[idIndex]);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid competitor ID');
  }
  return id;
}

// GET - Get SWOT items for a competitor
async function getHandler(request: NextRequest) {
  const competitorId = getCompetitorIdFromUrl(request);
  const { searchParams } = new URL(request.url);
  const grouped = searchParams.get('grouped') === 'true';

  if (grouped) {
    const swot = await competitorMonitoringService.getCompetitorSwotGrouped(competitorId);
    return NextResponse.json({ swot, grouped: true });
  }

  const swot = await competitorMonitoringService.getCompetitorSwot(competitorId);
  return NextResponse.json({
    swot,
    total: swot.length,
    grouped: false,
  });
}

// POST - Add new SWOT item
async function postHandler(request: NextRequest, session: AuthSession) {
  const competitorId = getCompetitorIdFromUrl(request);
  const body = await request.json() as Omit<CreateSwotInput, 'competitor_id'>;

  if (!body.category || !body.title) {
    throw new BadRequestError('Category and title are required');
  }

  const swotItem = await competitorMonitoringService.addSwotItem(
    {
      ...body,
      competitor_id: competitorId,
    },
    parseInt(session.userId)
  );

  return NextResponse.json({
    success: true,
    swot: swotItem,
  });
}

export const GET = withAdminAuth(async (request, _session) => getHandler(request));
export const POST = withAdminAuth(async (request, session) => postHandler(request, session));
