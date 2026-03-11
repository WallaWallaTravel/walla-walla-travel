import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError, ValidationError } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { prisma } from '@/lib/prisma';
import { INSIDER_TIP_TYPES } from '@/lib/config/content-types';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { z } from 'zod';

const tipTypeValues = ['locals_know', 'best_time', 'what_to_ask', 'pairing', 'photo_spot', 'hidden_gem', 'practical'] as const;

const PostBodySchema = z.object({
  tip_type: z.enum(tipTypeValues),
  title: z.string().max(255).optional().nullable(),
  content: z.string().min(1).max(500),
  is_featured: z.boolean().optional(),
});

const PutBodySchema = z.object({
  id: z.number().int().positive(),
  tip_type: z.enum(tipTypeValues),
  title: z.string().max(255).optional().nullable(),
  content: z.string().min(1).max(500),
  is_featured: z.boolean().optional(),
});

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
  const session = await getSession();

  if (!session || (session.user.role !== 'partner' && session.user.role !== 'admin')) {
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
    tips = await prisma.$queryRaw<typeof tips>`
      SELECT id, tip_type, title, content, is_featured, verified, created_at
       FROM winery_insider_tips
       WHERE winery_id = ${profile.winery_id}
       ORDER BY is_featured DESC, created_at DESC`;
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
export const POST =
  withRateLimit(rateLimiters.api)(
  withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();

  if (!session || (session.user.role !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  if (!profile.winery_id) {
    throw new ValidationError('No winery linked to this partner profile');
  }

  const body = PostBodySchema.parse(await request.json());
  const { tip_type, title, content, is_featured } = body;

  // Validate tip type
  if (!VALID_TIP_TYPES.includes(tip_type)) {
    throw new ValidationError(`Invalid tip type: ${tip_type}`);
  }

  if (!content || typeof content !== 'string') {
    throw new ValidationError('Content is required');
  }

  if (content.length < 20) {
    throw new ValidationError('Content must be at least 20 characters');
  }

  if (content.length > 500) {
    throw new ValidationError('Content must be less than 500 characters');
  }

  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
    INSERT INTO winery_insider_tips
       (winery_id, tip_type, title, content, is_featured, data_source, verified, created_by, created_at, updated_at)
     VALUES (${profile.winery_id}, ${tip_type}, ${title || null}, ${content}, ${is_featured || false}, 'partner_portal', false, ${session.user.id}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id`;

  await partnerService.logActivity(
    profile.id,
    'tip_created',
    { tip_type, tip_id: rows[0].id },
    getClientIp(request)
  );

  return NextResponse.json({
    success: true,
    id: rows[0].id,
    message: 'Tip created and submitted for review',
    timestamp: new Date().toISOString(),
  });
}));

/**
 * PUT /api/partner/tips
 * Update an existing insider tip
 */
export const PUT =
  withRateLimit(rateLimiters.api)(
  withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();

  if (!session || (session.user.role !== 'partner' && session.user.role !== 'admin')) {
    throw new UnauthorizedError('Partner access required');
  }

  const profile = await partnerService.getProfileByUserId(session.user.id);

  if (!profile) {
    throw new NotFoundError('Partner profile not found');
  }

  if (!profile.winery_id) {
    throw new ValidationError('No winery linked to this partner profile');
  }

  const body = PutBodySchema.parse(await request.json());
  const { id, tip_type, title, content, is_featured } = body;

  if (!id) {
    throw new ValidationError('Tip ID is required');
  }

  const existingRows = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM winery_insider_tips WHERE id = ${id} AND winery_id = ${profile.winery_id}`;

  if (existingRows.length === 0) {
    throw new NotFoundError('Tip not found');
  }

  if (!VALID_TIP_TYPES.includes(tip_type)) {
    throw new ValidationError(`Invalid tip type: ${tip_type}`);
  }

  if (!content || content.length < 20) {
    throw new ValidationError('Content must be at least 20 characters');
  }

  await prisma.$executeRaw`
    UPDATE winery_insider_tips
     SET tip_type = ${tip_type}, title = ${title || null}, content = ${content}, is_featured = ${is_featured || false},
         verified = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = ${id}`;

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
}));

/**
 * DELETE /api/partner/tips
 * Delete an insider tip
 */
export const DELETE =
  withRateLimit(rateLimiters.api)(
  withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();

  if (!session || (session.user.role !== 'partner' && session.user.role !== 'admin')) {
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

  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
    DELETE FROM winery_insider_tips WHERE id = ${parseInt(id)} AND winery_id = ${profile.winery_id} RETURNING id`;

  if (rows.length === 0) {
    throw new NotFoundError('Tip not found');
  }

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
}));
