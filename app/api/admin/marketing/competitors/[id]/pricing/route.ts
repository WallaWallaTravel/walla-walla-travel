import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { CreatePricingInput } from '@/types/competitors';

function getCompetitorIdFromUrl(request: NextRequest): number {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  // URL is /api/admin/marketing/competitors/[id]/pricing
  const idIndex = segments.indexOf('competitors') + 1;
  const id = parseInt(segments[idIndex]);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid competitor ID');
  }
  return id;
}

// GET - Get pricing for a competitor
async function getHandler(request: NextRequest) {
  const competitorId = getCompetitorIdFromUrl(request);
  const { searchParams } = new URL(request.url);
  const currentOnly = searchParams.get('current_only') !== 'false';

  const pricing = await competitorMonitoringService.getCompetitorPricing(competitorId, currentOnly);

  return NextResponse.json({
    pricing,
    total: pricing.length,
  });
}

// POST - Add new pricing entry
async function postHandler(request: NextRequest) {
  const competitorId = getCompetitorIdFromUrl(request);
  const body = await request.json() as Omit<CreatePricingInput, 'competitor_id'>;

  if (!body.pricing_type || !body.pricing_name) {
    throw new BadRequestError('Pricing type and name are required');
  }

  const pricing = await competitorMonitoringService.addPricing({
    ...body,
    competitor_id: competitorId,
  });

  return NextResponse.json({
    success: true,
    pricing,
  });
}

export const GET = withAdminAuth(async (request, _session) => getHandler(request));
export const POST = withAdminAuth(async (request, _session) => postHandler(request));
