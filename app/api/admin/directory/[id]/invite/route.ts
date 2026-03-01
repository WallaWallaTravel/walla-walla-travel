/**
 * Admin: Business Invitation Management
 * Generate invite links and send invitation emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { BadRequestError } from '@/lib/api/middleware/error-handler';
import { businessDirectoryService } from '@/lib/services/business-directory.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const InviteRequestSchema = z.object({
  // 'link' = just generate link, 'email' = send email (also generates link if needed)
  action: z.enum(['link', 'email']),
  email: z.string().email().optional(),
  expirationDays: z.number().min(1).max(90).optional().default(30),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/directory/[id]/invite
 * Generate invitation link or send invitation email
 *
 * Body: {
 *   action: 'link' | 'email',
 *   email?: string (required if action is 'email' and business has no email),
 *   expirationDays?: number (default 30)
 * }
 */
export const POST = withAdminAuth(async (request: NextRequest, session, context) => {
  const { id } = await context!.params;
  const businessId = parseInt(id);

  if (isNaN(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const body = await request.json();
  const parsed = InviteRequestSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError(`Validation error: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`);
  }

  const { action, email, expirationDays } = parsed.data;

  if (action === 'email') {
    // Send invitation email
    const result = await businessDirectoryService.sendInviteEmail(
      businessId,
      parseInt(session.userId),
      email
    );

    return NextResponse.json({
      success: true,
      action: 'email',
      businessId: result.business_id,
      inviteUrl: result.invite_url,
      inviteToken: result.invite_token,
      expiresAt: result.expires_at,
      emailSent: result.email_sent,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Just generate link
    const result = await businessDirectoryService.generateInviteLink(
      businessId,
      parseInt(session.userId),
      expirationDays
    );

    return NextResponse.json({
      success: true,
      action: 'link',
      businessId: result.business_id,
      inviteUrl: result.invite_url,
      inviteToken: result.invite_token,
      expiresAt: result.expires_at,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/directory/[id]/invite
 * Get current invitation status for a business
 */
export const GET = withAdminAuth(async (request: NextRequest, _session, context) => {
  const { id } = await context!.params;
  const businessId = parseInt(id);

  if (isNaN(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const business = await businessDirectoryService.getById(businessId);

  if (!business) {
    throw new BadRequestError('Business not found');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const hasActiveInvite = business.invite_token &&
    business.invite_token_expires_at &&
    new Date(business.invite_token_expires_at) > new Date();

  return NextResponse.json({
    success: true,
    businessId,
    status: business.status,
    hasActiveInvite,
    inviteUrl: hasActiveInvite ? `${appUrl}/partner-invite/${business.invite_token}` : null,
    expiresAt: hasActiveInvite ? business.invite_token_expires_at : null,
    invitedAt: business.invited_at,
    emailSent: business.invitation_email_sent,
    emailSentAt: business.invitation_email_sent_at,
    timestamp: new Date().toISOString(),
  });
});
