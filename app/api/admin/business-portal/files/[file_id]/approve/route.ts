/**
 * Admin API: Approve/Reject File
 * Update file approval status
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/business-portal/files/[file_id]/approve
 * Approve or reject a file
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ file_id: string }> }
) {
  try {
    const { file_id } = await params;
    const fileId = parseInt(file_id);
    const { approved, notes } = await request.json();

    if (isNaN(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID' },
        { status: 400 }
      );
    }

    console.log('[Admin] Setting file approval:', fileId, approved ? 'APPROVED' : 'REJECTED');

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
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
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

    console.log('[Admin] File approval updated successfully');

    return NextResponse.json({
      success: true,
      file
    });

  } catch (error: any) {
    console.error('[Admin] Error updating file approval:', error);
    return NextResponse.json(
      { error: 'Failed to update file approval', details: error.message },
      { status: 500 }
    );
  }
}

