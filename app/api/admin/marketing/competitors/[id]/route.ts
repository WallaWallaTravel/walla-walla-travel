import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError, NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { UpdateCompetitorInput } from '@/types/competitors';

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  return session;
}

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
  await verifyAdmin(request);

  const id = getIdFromUrl(request);
  const result = await competitorMonitoringService.getCompetitorDetail(id);

  if (!result) {
    throw new NotFoundError('Competitor not found');
  }

  return NextResponse.json(result);
}

// PUT - Update competitor
async function putHandler(request: NextRequest) {
  await verifyAdmin(request);

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
  await verifyAdmin(request);

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

export const GET = withErrorHandling(getHandler);
export const PUT = withErrorHandling(putHandler);
export const DELETE = withErrorHandling(deleteHandler);
