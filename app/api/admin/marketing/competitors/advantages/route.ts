import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { CreateAdvantageInput } from '@/types/competitors';

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
  const body = await request.json() as CreateAdvantageInput;

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

  const body = await request.json() as Partial<CreateAdvantageInput>;

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
