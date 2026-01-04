/**
 * Admin API: List Businesses
 * Get all businesses with their status
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/business-portal/businesses
 * List all businesses
 */
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        id,
        business_type,
        name,
        slug,
        contact_name,
        contact_email,
        contact_phone,
        unique_code,
        status,
        completion_percentage,
        website,
        invited_at,
        first_access_at,
        last_activity_at,
        submitted_at,
        approved_at
      FROM businesses
      ORDER BY last_activity_at DESC NULLS LAST, invited_at DESC
    `);
    
    return NextResponse.json({
      success: true,
      businesses: result.rows
    });
    
  } catch (error) {
    logger.error('Admin: Failed to list businesses', { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to list businesses', details: message },
      { status: 500 }
    );
  }
}

