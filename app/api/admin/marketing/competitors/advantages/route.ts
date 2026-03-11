import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { CreateAdvantageInput } from '@/types/competitors';


const PostBodySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
  category: z.enum(['service', 'pricing', 'experience', 'technology', 'expertise', 'location', 'vehicle', 'partnership', 'other']),
  importance: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  supporting_evidence: z.string().max(5000).optional(),
  customer_testimonial: z.string().max(5000).optional(),
  applies_to_competitors: z.array(z.number().int().positive()).optional(),
  marketing_message: z.string().max(5000).optional(),
  use_in_proposals: z.boolean().optional(),
  use_on_website: z.boolean().optional(),
});

const PutBodySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(5000).optional(),
  category: z.enum(['service', 'pricing', 'experience', 'technology', 'expertise', 'location', 'vehicle', 'partnership', 'other']).optional(),
  importance: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  supporting_evidence: z.string().max(5000).optional(),
  customer_testimonial: z.string().max(5000).optional(),
  applies_to_competitors: z.array(z.number().int().positive()).optional(),
  marketing_message: z.string().max(5000).optional(),
  use_in_proposals: z.boolean().optional(),
  use_on_website: z.boolean().optional(),
});

// GET - Get all competitive advantages
async function getHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const competitorId = searchParams.get('competitor_id');

  let advantages;
  if (competitorId) {
    advantages = await competitorMonitoringService.getAdvantagesForCompetitor(parseInt(competitorId));
  } else {
    advantages = await competitorMonitoringService.getAdvantages();
  }

  return NextResponse.json({
    advantages,
    total: advantages.length,
  });
}

// POST - Create new competitive advantage
async function postHandler(request: NextRequest, session: AuthSession) {
  const body = PostBodySchema.parse(await request.json()) as CreateAdvantageInput;

  if (!body.title || !body.description || !body.category) {
    throw new BadRequestError('Title, description, and category are required');
  }

  const advantage = await competitorMonitoringService.createAdvantage(
    body,
    parseInt(session.userId)
  );

  return NextResponse.json({
    success: true,
    advantage,
  });
}

// PUT - Update competitive advantage
async function putHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new BadRequestError('Advantage ID is required');
  }

  const body = PutBodySchema.parse(await request.json()) as Partial<CreateAdvantageInput>;

  const advantage = await competitorMonitoringService.updateAdvantage(
    parseInt(id),
    body
  );

  if (!advantage) {
    throw new NotFoundError('Advantage not found');
  }

  return NextResponse.json({
    success: true,
    advantage,
  });
}

export const GET = withAdminAuth(async (request, _session) => getHandler(request));
export const POST = withAdminAuth(async (request, session) => postHandler(request, session));
export const PUT = withAdminAuth(async (request, _session) => putHandler(request));
