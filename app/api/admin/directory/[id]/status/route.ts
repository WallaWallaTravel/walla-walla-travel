/**
 * Admin: Business Status Management
 * Update status (approve, reject, restore)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { businessDirectoryService } from '@/lib/services/business-directory.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const StatusUpdateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'imported']),
  notes: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/directory/[id]/status
 * Update business status
 *
 * Body: { status: 'approved' | 'rejected' | 'imported', notes?: string }
 *
 * Actions:
 * - 'approved': Mark business as approved (ready for invitation)
 * - 'rejected': Mark business as rejected (hidden but tracked)
 * - 'imported': Restore from rejected back to imported
 */
export const PATCH = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { id } = await params;
  const businessId = parseInt(id);

  if (isNaN(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const body = await request.json();
  const parsed = StatusUpdateSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError(`Validation error: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`);
  }

  const { status, notes } = parsed.data;

  let business;

  switch (status) {
    case 'approved':
      business = await businessDirectoryService.approve(businessId, session.user.id, notes);
      break;
    case 'rejected':
      business = await businessDirectoryService.reject(businessId, session.user.id, notes);
      break;
    case 'imported':
      // Restore from rejected
      business = await businessDirectoryService.restore(businessId, session.user.id);
      break;
    default:
      throw new BadRequestError(`Invalid status: ${status}`);
  }

  return NextResponse.json({
    success: true,
    business,
    message: `Business status updated to ${status}`,
    timestamp: new Date().toISOString(),
  });
});
