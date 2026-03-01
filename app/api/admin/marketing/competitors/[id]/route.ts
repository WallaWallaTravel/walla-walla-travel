import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { UpdateCompetitorInput } from '@/types/competitors';
import { withCSRF } from '@/lib/api/middleware/csrf';

const BodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  website_url: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  competitor_type: z.enum(['tour_operator', 'content_benchmark', 'indirect', 'aggregator']).optional(),
  priority_level: z.enum(['high', 'medium', 'low']).optional(),
  check_frequency: z.enum(['every_6_hours', 'daily', 'weekly', 'monthly']).optional(),
  monitor_pricing: z.boolean().optional(),
  monitor_promotions: z.boolean().optional(),
  monitor_packages: z.boolean().optional(),
  monitor_content: z.boolean().optional(),
  monitored_pages: z.array(z.string().max(500)).optional(),
  email_recipients: z.array(z.string().email()).optional(),
  alert_on_high_threat: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
  logo_url: z.string().max(500).optional(),
  pricing_model: z.string().max(255).optional(),
  min_booking: z.string().max(255).optional(),
  vehicle_types: z.array(z.string().max(255)).optional(),
  is_active: z.boolean().optional(),
});

function getIdFromUrl(request: NextRequest): number {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const id = parseInt(segments[segments.length - 1]);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid competitor ID');
  }
  return id;
}

// GET - Get single competitor with details
async function getHandler(request: NextRequest) {
  const id = getIdFromUrl(request);
  const result = await competitorMonitoringService.getCompetitorDetail(id);

  if (!result) {
    throw new NotFoundError('Competitor not found');
  }

  return NextResponse.json(result);
}

// PUT - Update competitor
async function putHandler(request: NextRequest) {
  const id = getIdFromUrl(request);
  const body = BodySchema.parse(await request.json()) as UpdateCompetitorInput;

  const competitor = await competitorMonitoringService.updateCompetitor(id, body);

  if (!competitor) {
    throw new NotFoundError('Competitor not found');
  }

  return NextResponse.json({
    success: true,
    competitor,
  });
}

// DELETE - Deactivate competitor (soft delete)
async function deleteHandler(request: NextRequest) {
  const id = getIdFromUrl(request);
  const success = await competitorMonitoringService.deactivateCompetitor(id);

  if (!success) {
    throw new NotFoundError('Competitor not found');
  }

  return NextResponse.json({
    success: true,
    message: 'Competitor deactivated',
  });
}

export const GET = withAdminAuth(async (request, _session) => getHandler(request));
export const PUT = withCSRF(
  withAdminAuth(async (request, _session) => putHandler(request))
);
export const DELETE = withCSRF(
  withAdminAuth(async (request, _session) => deleteHandler(request))
);
