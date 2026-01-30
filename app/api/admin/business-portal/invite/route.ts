/**
 * Admin API: Batch Invite Businesses
 * Create multiple business invites and send invitation emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface BusinessInvite {
  name: string;
  business_type: string;
  contact_email: string;
  contact_phone?: string;
}

/**
 * POST /api/admin/business-portal/invite
 * Send batch invites to businesses
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { businesses } = body as { businesses: BusinessInvite[] };

  if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
    throw new BadRequestError('Please provide an array of businesses to invite');
  }

  logger.info('Processing business invites', { count: businesses.length });

  const results = [];

  for (const business of businesses) {
    try {
      // Validate required fields
      if (!business.name || !business.contact_email) {
        results.push({
          business,
          success: false,
          error: 'Name and email are required'
        });
        continue;
      }

      // Generate unique code
      const unique_code = crypto.randomBytes(8).toString('hex').toUpperCase();

      // Insert into database
      const result = await query(
        `INSERT INTO businesses
          (name, business_type, contact_email, contact_phone, unique_code, status)
        VALUES ($1, $2, $3, $4, $5, 'invited')
        RETURNING id, unique_code`,
        [
          business.name,
          business.business_type,
          business.contact_email,
          business.contact_phone || null,
          unique_code
        ]
      );

      const newBusiness = result.rows[0];

      // TODO: Send email with unique code
      // await sendInviteEmail(business.contact_email, business.name, unique_code);

      logger.info('Created business invite', { businessName: business.name, code: unique_code });

      results.push({
        business,
        success: true,
        id: newBusiness.id,
        unique_code: newBusiness.unique_code,
        message: `Invite created! Code: ${newBusiness.unique_code}`
      });

    } catch (error) {
      logger.error('Error inviting business', { businessName: business.name, error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = error instanceof Error && 'code' in error ? (error as { code?: string }).code : undefined;

      // Handle duplicate email
      if (errorMessage.includes('duplicate') || errorCode === '23505') {
        results.push({
          business,
          success: false,
          error: 'This email has already been invited'
        });
      } else {
        results.push({
          business,
          success: false,
          error: errorMessage
        });
      }
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  logger.info('Batch invite complete', { succeeded: successCount, failed: failCount });

  return NextResponse.json({
    success: true,
    message: `Sent ${successCount} invite(s). ${failCount} failed.`,
    results,
    stats: {
      total: businesses.length,
      succeeded: successCount,
      failed: failCount
    }
  });
});
