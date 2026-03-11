import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { competitorMonitoringService } from '@/lib/services/competitor-monitoring.service';
import type { UpdateChangeStatusInput } from '@/types/competitors';


const BodySchema = z.object({
  status: z.enum(['new', 'reviewed', 'actioned', 'dismissed', 'archived']),
  action_taken: z.string().max(5000).optional(),
});

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
async function putHandler(request: NextRequest, session: AuthSession) {
  const id = getIdFromUrl(request);
  const body = BodySchema.parse(await request.json()) as UpdateChangeStatusInput;

  if (!body.status) {
    throw new BadRequestError('Status is required');
  }

  const change = await competitorMonitoringService.updateChangeStatus(
    id,
    body,
    parseInt(session.userId)
  );

  if (!change) {
    throw new NotFoundError('Change not found');
  }

  return NextResponse.json({
    success: true,
    change,
  });
}

export const PUT = withAdminAuth(async (request, session) => putHandler(request, session));
