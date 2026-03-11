/**
 * Partner Invitation API
 * Validate and accept partner invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { businessDirectoryService } from '@/lib/services/business-directory.service';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/partner-invite/[token]
 * Validate an invitation token and return business info
 * Public endpoint - no auth required
 */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams): Promise<NextResponse> => {
  const { token } = await params;

  if (!token) {
    throw new BadRequestError('Invitation token is required');
  }

  const validation = await businessDirectoryService.validateInviteToken(token);

  if (!validation.valid) {
    return NextResponse.json({
      success: false,
      valid: false,
      error: validation.error,
    }, { status: 400 });
  }

  // Return limited business info (don't expose internal fields)
  const business = validation.business!;

  return NextResponse.json({
    success: true,
    valid: true,
    business: {
      id: business.id,
      name: business.name,
      business_type: business.business_type,
      city: business.city,
      state: business.state,
    },
  });
});

const AcceptInvitationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/partner-invite/[token]
 * Accept an invitation and create partner account
 *
 * Body: {
 *   name: string,
 *   email: string,
 *   password: string
 * }
 */
export const POST =
  withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { token } = await params;

  if (!token) {
    throw new BadRequestError('Invitation token is required');
  }

  // Validate token first
  const validation = await businessDirectoryService.validateInviteToken(token);

  if (!validation.valid) {
    throw new BadRequestError(validation.error || 'Invalid invitation');
  }

  const body = await request.json();
  const parsed = AcceptInvitationSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError(`Validation error: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`);
  }

  const { name, email, password } = parsed.data;
  const business = validation.business!;

  // Check if email already exists
  const existingUser = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM users WHERE email = ${email.toLowerCase()}`;

  if (existingUser.length > 0) {
    throw new BadRequestError('An account with this email already exists. Please log in instead.');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user with partner role
  const userRows = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO users (email, name, password_hash, role, is_active)
     VALUES (${email.toLowerCase()}, ${name}, ${passwordHash}, 'partner', true)
     RETURNING id`;

  if (userRows.length === 0) {
    throw new Error('Failed to create user');
  }

  const userId = userRows[0].id;

  // Revoke any existing sessions (defensive — new user unlikely to have sessions)
  const { sessionStoreService } = await import('@/lib/services/session-store.service');
  await sessionStoreService.revokeAllUserSessions(userId);

  // Create partner profile linked to the business
  const profileRows = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO partner_profiles (
      user_id, business_name, business_type, winery_id, status,
      setup_completed_at, notes
    ) VALUES (${userId}, ${business.name}, ${business.business_type}, ${business.winery_id || null}, 'active', CURRENT_TIMESTAMP, 'Joined via business directory invitation')
    RETURNING id`;

  if (profileRows.length === 0) {
    throw new Error('Failed to create partner profile');
  }

  const partnerProfileId = profileRows[0].id;

  // Accept the invitation (updates business record)
  await businessDirectoryService.acceptInvitation(token, userId, partnerProfileId);

  return NextResponse.json({
    success: true,
    message: 'Invitation accepted! You can now log in to the Partner Portal.',
    userId,
    partnerProfileId,
    businessId: business.id,
  });
});
