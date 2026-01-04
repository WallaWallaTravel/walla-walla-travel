/**
 * Admin API: Get Business Details
 * Fetch complete business submission with all answers, files, and analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { detectDiscrepancies } from '@/lib/business-portal/discrepancy-detector';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/business-portal/[business_id]
 * Get complete business details for review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ business_id: string }> }
) {
  try {
    const { business_id } = await params;
    const businessId = parseInt(business_id);

    if (isNaN(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    logger.debug('Fetching business details', { businessId });

    // Get business info
    const businessResult = await query(
      `SELECT * FROM businesses WHERE id = $1`,
      [businessId]
    );

    if (businessResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const business = businessResult.rows[0];

    // Get voice entries
    const voiceResult = await query(
      `SELECT 
        ve.*,
        q.question_text as question_text_from_table,
        q.category,
        q.question_number
      FROM business_voice_entries ve
      LEFT JOIN interview_questions q ON ve.question_id = q.id
      WHERE ve.business_id = $1
      ORDER BY ve.question_number ASC`,
      [businessId]
    );

    // Get text entries
    const textResult = await query(
      `SELECT 
        te.*,
        q.question_text as question_text_from_table,
        q.category,
        q.question_number
      FROM business_text_entries te
      LEFT JOIN interview_questions q ON te.question_id = q.id
      WHERE te.business_id = $1
      ORDER BY te.question_number ASC`,
      [businessId]
    );

    // Get files with analysis
    const filesResult = await query(
      `SELECT 
        id,
        file_type,
        original_filename,
        file_size_bytes,
        mime_type,
        processing_status,
        ai_description,
        ai_tags,
        category,
        uploaded_at,
        approved,
        storage_url
      FROM business_files
      WHERE business_id = $1
      ORDER BY uploaded_at DESC`,
      [businessId]
    );

    // Get processing job stats
    const jobStatsResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'processing') as processing,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM processing_jobs
      WHERE business_id = $1`,
      [businessId]
    );

    const jobStats = jobStatsResult.rows[0] || {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    // Detect discrepancies
    logger.debug('Detecting discrepancies', { businessId });
    const discrepancies = await detectDiscrepancies(businessId);

    logger.debug('Business details fetched successfully', { businessId });

    return NextResponse.json({
      success: true,
      business,
      voiceEntries: voiceResult.rows,
      textEntries: textResult.rows,
      files: filesResult.rows,
      jobStats: {
        pending: parseInt(jobStats.pending || '0'),
        processing: parseInt(jobStats.processing || '0'),
        completed: parseInt(jobStats.completed || '0'),
        failed: parseInt(jobStats.failed || '0')
      },
      discrepancies
    });

  } catch (error) {
    logger.error('Error fetching business details', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch business details', details: message },
      { status: 500 }
    );
  }
}

