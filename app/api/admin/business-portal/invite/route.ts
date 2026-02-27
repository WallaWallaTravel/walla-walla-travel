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
  business_types?: string[];
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

      // Generate unique invite token
      const invite_token = crypto.randomBytes(16).toString('hex');

      // Insert into database
      // Columns match migration 059: email, phone, invite_token (not contact_email, contact_phone, unique_code)
      const businessTypes = business.business_types || [business.business_type];
      const result = await query(
        `INSERT INTO businesses
          (name, business_type, business_types, email, phone, invite_token, status, invited_at)
        VALUES ($1, $2, $3::TEXT[], $4, $5, $6, 'invited', NOW())
        RETURNING id, invite_token`,
        [
          business.name,
          businessTypes[0],
          businessTypes,
          business.contact_email,
          business.contact_phone || null,
          invite_token
        ]
      );

      const newBusiness = result.rows[0];

      // TODO: Send email with invite token
      // await sendInviteEmail(business.contact_email, business.name, invite_token);

      logger.info('Created business invite', { businessName: business.name, token: invite_token });

      results.push({
        business,
        success: true,
        id: newBusiness.id,
        invite_token: newBusiness.invite_token,
        message: `Invite created! Code: ${newBusiness.invite_token}`
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
