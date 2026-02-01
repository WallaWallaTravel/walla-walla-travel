/**
 * Admin: Bulk Business Operations
 * Approve or reject multiple businesses at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { businessDirectoryService } from '@/lib/services/business-directory.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BulkActionSchema = z.object({
  ids: z.array(z.number()).min(1, 'At least one business ID is required'),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/directory/bulk
 * Perform bulk actions on multiple businesses
 *
 * Body: {
 *   ids: number[],
 *   action: 'approve' | 'reject',
 *   notes?: string
 * }
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const body = await request.json();
  const parsed = BulkActionSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError(`Validation error: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`);
  }

  const { ids, action, notes } = parsed.data;

  const status = action === 'approve' ? 'approved' : 'rejected';
  const updatedCount = await businessDirectoryService.bulkUpdateStatus(
    ids,
    status,
    session.user.id,
    notes
  );

  return NextResponse.json({
    success: true,
    action,
    requestedCount: ids.length,
    updatedCount,
    message: `${updatedCount} businesses ${action === 'approve' ? 'approved' : 'rejected'}`,
    timestamp: new Date().toISOString(),
  });
});
