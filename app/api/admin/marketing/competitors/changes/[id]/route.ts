import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { withErrorHandling, UnauthorizedError, NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { UpdateChangeStatusInput } from '@/types/competitors';

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
    throw new BadRequestError('Invalid change ID');
  }
  return id;
}

// PUT - Update change status (review, action, dismiss)
async function putHandler(request: NextRequest) {
  const session = await verifyAdmin(request);

  const id = getIdFromUrl(request);
  const body = await request.json() as UpdateChangeStatusInput;

  if (!body.status) {
    throw new BadRequestError('Status is required');
  }

  const change = await competitorMonitoringService.updateChangeStatus(
    id,
    body,
    session.user.id
  );

  if (!change) {
    throw new NotFoundError('Change not found');
  }

  return NextResponse.json({
    success: true,
    change,
  });
}

export const PUT = withErrorHandling(putHandler);
