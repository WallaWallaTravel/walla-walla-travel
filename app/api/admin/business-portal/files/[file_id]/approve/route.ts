/**
 * Admin API: Approve/Reject File
 * Update file approval status
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/business-portal/files/[file_id]/approve
 * Approve or reject a file
 */
export const POST = withAdminAuth(async (
  request: NextRequest, _session, context
) => {
  const { file_id } = await context!.params;
  const fileId = parseInt(file_id);
  const { approved, notes } = await request.json();

  if (isNaN(fileId)) {
    throw new BadRequestError('Invalid file ID');
  }

  logger.info('Setting file approval', { fileId, approved });

  // Update file
  const result = await query(
    `UPDATE business_files
     SET
       approved = $1,
       admin_notes = $2,
       reviewed_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [approved, notes || null, fileId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const file = result.rows[0];

  // Log activity
  await query(
    `INSERT INTO business_activity_log (
      business_id,
      activity_type,
      activity_description,
      metadata
    ) VALUES ($1, $2, $3, $4)`,
    [
      file.business_id,
      approved ? 'file_approved' : 'file_rejected',
      `File ${file.original_filename} ${approved ? 'approved' : 'rejected'}`,
      JSON.stringify({ file_id: fileId, notes })
    ]
  );

  logger.info('File approval updated successfully', { fileId });

  return NextResponse.json({
    success: true,
    file
  });
});
