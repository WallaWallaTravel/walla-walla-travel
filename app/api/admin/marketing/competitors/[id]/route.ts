import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { UpdateCompetitorInput } from '@/types/competitors';

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
  const body = await request.json() as UpdateCompetitorInput;

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
export const PUT = withAdminAuth(async (request, _session) => putHandler(request));
export const DELETE = withAdminAuth(async (request, _session) => deleteHandler(request));
