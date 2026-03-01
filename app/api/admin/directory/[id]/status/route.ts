/**
 * Admin: Business Status Management
 * Update status (approve, reject, restore)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { businessDirectoryService } from '@/lib/services/business-directory.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const StatusUpdateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'imported']),
  notes: z.string().optional(),
});

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
export const PATCH = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await context!.params;
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
      business = await businessDirectoryService.approve(businessId, parseInt(session.userId), notes);
      break;
    case 'rejected':
      business = await businessDirectoryService.reject(businessId, parseInt(session.userId), notes);
      break;
    case 'imported':
      // Restore from rejected
      business = await businessDirectoryService.restore(businessId, parseInt(session.userId));
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
