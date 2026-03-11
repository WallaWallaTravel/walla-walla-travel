import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { CreatePricingInput } from '@/types/competitors';
import { withCSRF } from '@/lib/api/middleware/csrf';

const BodySchema = z.object({
  pricing_type: z.enum(['base_tour', 'hourly_rate', 'per_person', 'premium_package', 'group_discount', 'promotion', 'other']),
  pricing_name: z.string().min(1).max(255),
  price_amount: z.number().positive().optional(),
  price_unit: z.string().max(255).optional(),
  price_notes: z.string().max(5000).optional(),
  comparable_to_nw_touring: z.boolean().optional(),
  nw_touring_equivalent: z.string().max(500).optional(),
  effective_from: z.string().max(255).optional(),
});

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
  const body = BodySchema.parse(await request.json()) as Omit<CreatePricingInput, 'competitor_id'>;

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
export const POST = withCSRF(
  withAdminAuth(async (request, _session) => postHandler(request))
);
