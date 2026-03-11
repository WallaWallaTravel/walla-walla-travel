import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { PriorityLevel, CreateCompetitorInput } from '@/types/competitors';


const BodySchema = z.object({
  name: z.string().min(1).max(255),
  website_url: z.string().min(1).max(500),
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
});

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
  const body = BodySchema.parse(await request.json()) as CreateCompetitorInput;

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
