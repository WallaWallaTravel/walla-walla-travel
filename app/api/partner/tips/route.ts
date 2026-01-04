import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { query } from '@/lib/db';
import { INSIDER_TIP_TYPES } from '@/lib/config/content-types';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

// Get client IP from request headers
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIp || 'unknown';
}

// Valid tip types
const VALID_TIP_TYPES = Object.values(INSIDER_TIP_TYPES);

/**
 * GET /api/partner/tips
 * Get partner's insider tips
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  let tips: Array<{
    id: number;
    tip_type: string;
    title: string;
    content: string;
    is_featured: boolean;
    verified: boolean;
    created_at: string;
  }> = [];

  if (profile.winery_id) {
    const result = await query(
      `SELECT id, tip_type, title, content, is_featured, verified, created_at
       FROM winery_insider_tips
       WHERE winery_id = $1
       ORDER BY is_featured DESC, created_at DESC`,
      [profile.winery_id]
    );
    tips = result.rows;
  }

  return NextResponse.json({
    success: true,
    tips,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/partner/tips
 * Create a new insider tip
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  if (!profile.winery_id) {
    throw new ValidationError('No winery linked to this partner profile');
  }

  const body = await request.json();
  const { tip_type, title, content, is_featured } = body;

  // Validate tip type
  if (!VALID_TIP_TYPES.includes(tip_type)) {
    throw new ValidationError(`Invalid tip type: ${tip_type}`);
  }

  // Validate content
  if (!content || typeof content !== 'string') {
    throw new ValidationError('Content is required');
  }

  if (content.length < 20) {
    throw new ValidationError('Content must be at least 20 characters');
  }

  if (content.length > 500) {
    throw new ValidationError('Content must be less than 500 characters');
  }

  // Insert new tip
  const result = await query(
    `INSERT INTO winery_insider_tips
       (winery_id, tip_type, title, content, is_featured, data_source, verified, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'partner_portal', false, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      profile.winery_id,
      tip_type,
      title || null,
      content,
      is_featured || false,
      session.user.id,
    ]
  );

  // Log the activity
  await partnerService.logActivity(
    profile.id,
    'tip_created',
    { tip_type, tip_id: result.rows[0].id },
    getClientIp(request)
  );

  return NextResponse.json({
    success: true,
    id: result.rows[0].id,
    message: 'Tip created and submitted for review',
    timestamp: new Date().toISOString(),
  });
})));

/**
 * PUT /api/partner/tips
 * Update an existing insider tip
 */
export const PUT = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  if (!profile.winery_id) {
    throw new ValidationError('No winery linked to this partner profile');
  }

  const body = await request.json();
  const { id, tip_type, title, content, is_featured } = body;

  if (!id) {
    throw new ValidationError('Tip ID is required');
  }

  // Verify ownership
  const existingResult = await query(
    `SELECT id FROM winery_insider_tips WHERE id = $1 AND winery_id = $2`,
    [id, profile.winery_id]
  );

  if (existingResult.rows.length === 0) {
    throw new NotFoundError('Tip not found');
  }

  // Validate tip type
  if (!VALID_TIP_TYPES.includes(tip_type)) {
    throw new ValidationError(`Invalid tip type: ${tip_type}`);
  }

  // Validate content
  if (!content || content.length < 20) {
    throw new ValidationError('Content must be at least 20 characters');
  }

  // Update tip
  await query(
    `UPDATE winery_insider_tips
     SET tip_type = $1, title = $2, content = $3, is_featured = $4,
         verified = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [tip_type, title || null, content, is_featured || false, id]
  );

  // Log the activity
  await partnerService.logActivity(
    profile.id,
    'tip_updated',
    { tip_type, tip_id: id },
    getClientIp(request)
  );

  return NextResponse.json({
    success: true,
    message: 'Tip updated and submitted for review',
    timestamp: new Date().toISOString(),
  });
})));

/**
 * DELETE /api/partner/tips
 * Delete an insider tip
 */
export const DELETE = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || (session.user.role as string !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ValidationError('Tip ID is required');
  }

  // Verify ownership and delete
  const result = await query(
    `DELETE FROM winery_insider_tips WHERE id = $1 AND winery_id = $2 RETURNING id`,
    [id, profile.winery_id]
  );

  if (result.rowCount === 0) {
    throw new NotFoundError('Tip not found');
  }

  // Log the activity
  await partnerService.logActivity(
    profile.id,
    'tip_deleted',
    { tip_id: id },
    getClientIp(request)
  );

  return NextResponse.json({
    success: true,
    message: 'Tip deleted',
    timestamp: new Date().toISOString(),
  });
})));
