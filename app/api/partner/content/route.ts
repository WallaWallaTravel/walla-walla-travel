import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { query } from '@/lib/db';
import { WINERY_CONTENT_TYPES } from '@/lib/config/content-types';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

// Get client IP from request headers
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIp || 'unknown';
}

// Valid content types for stories
const STORY_CONTENT_TYPES = [
  WINERY_CONTENT_TYPES.ORIGIN_STORY,
  WINERY_CONTENT_TYPES.PHILOSOPHY,
  WINERY_CONTENT_TYPES.WHAT_MAKES_UNIQUE,
];

/**
 * GET /api/partner/content
 * Get partner's narrative content (stories)
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

  // Get content from winery_content table
  let content: Array<{
    id: number;
    content_type: string;
    content: string;
    status: string;
    updated_at: string;
  }> = [];

  if (profile.winery_id) {
    const result = await query<{
      id: number;
      content_type: string;
      content: string;
      status: string;
      updated_at: string;
    }>(
      `SELECT id, content_type, content,
        CASE
          WHEN verified = true THEN 'approved'
          WHEN verified = false AND id IS NOT NULL THEN 'pending'
          ELSE 'draft'
        END as status,
        updated_at
       FROM winery_content
       WHERE winery_id = $1 AND content_type = ANY($2)
       ORDER BY content_type`,
      [profile.winery_id, STORY_CONTENT_TYPES]
    );
    content = result.rows;
  }

  return NextResponse.json({
    success: true,
    content,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/partner/content
 * Create or update partner's narrative content
 */
export const POST = withRateLimit(rateLimiters.api)(
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
  const { content_type, content } = body;

  // Validate content type
  if (!STORY_CONTENT_TYPES.includes(content_type)) {
    throw new ValidationError(`Invalid content type: ${content_type}`);
  }

  // Validate content
  if (!content || typeof content !== 'string') {
    throw new ValidationError('Content is required');
  }

  if (content.length < 100) {
    throw new ValidationError('Content must be at least 100 characters');
  }

  if (content.length > 2000) {
    throw new ValidationError('Content must be less than 2000 characters');
  }

  // Check if content already exists for this type
  const existingResult = await query(
    `SELECT id FROM winery_content
     WHERE winery_id = $1 AND content_type = $2`,
    [profile.winery_id, content_type]
  );

  let contentId: number;

  if (existingResult.rows.length > 0) {
    // Update existing content
    const updateResult = await query(
      `UPDATE winery_content
       SET content = $1,
           verified = false,
           data_source = 'partner_portal',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id`,
      [content, existingResult.rows[0].id]
    );
    contentId = updateResult.rows[0].id;
  } else {
    // Insert new content
    const insertResult = await query(
      `INSERT INTO winery_content (winery_id, content_type, content, data_source, verified, created_at, updated_at)
       VALUES ($1, $2, $3, 'partner_portal', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [profile.winery_id, content_type, content]
    );
    contentId = insertResult.rows[0].id;
  }

  // Log the activity
  await partnerService.logActivity(
    profile.id,
    'content_submitted',
    { content_type, content_id: contentId },
    getClientIp(request)
  );

  return NextResponse.json({
    success: true,
    id: contentId,
    message: 'Content saved and submitted for review',
    timestamp: new Date().toISOString(),
  });
}));
