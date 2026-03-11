import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { prisma } from '@/lib/prisma';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';
import { z } from 'zod';

const BodySchema = z.object({
  description: z.string().max(5000).optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  tasting_fee: z.string().max(255).optional().nullable(),
  reservation_required: z.boolean().optional().nullable(),
  hours: z.record(z.string(), z.unknown()).optional().nullable(),
  specialties: z.array(z.string().max(255)).optional().nullable(),
  features: z.array(z.string().max(255)).optional().nullable(),
  experience_tags: z.array(z.string().max(255)).optional().nullable(),
  min_group_size: z.number().int().positive().optional().nullable(),
  max_group_size: z.number().int().positive().optional().nullable(),
  booking_advance_days_min: z.number().int().nonnegative().optional().nullable(),
  booking_advance_days_max: z.number().int().nonnegative().optional().nullable(),
  cancellation_policy: z.string().max(5000).optional().nullable(),
  pet_policy: z.string().max(5000).optional().nullable(),
});

// Get client IP from request headers (Next.js 15 removed request.ip)
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIp || 'unknown';
}

/**
 * GET /api/partner/listing
 * Get partner's directory listing data
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

  // Get listing data from the linked entity (winery, hotel, restaurant)
  let listing = null;

  if (profile.winery_id) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        name, description, short_description, address, city, phone, website,
        tasting_fee, reservation_required, hours_of_operation as hours,
        specialties, amenities as features,
        experience_tags, min_group_size, max_group_size,
        booking_advance_days_min, booking_advance_days_max,
        cancellation_policy, pet_policy
       FROM wineries WHERE id = ${profile.winery_id}`;
    if (rows[0]) {
      const row = rows[0];
      listing = {
        ...row,
        short_description: (row.short_description as string) || (row.description as string)?.substring(0, 150) || '',
        specialties: row.specialties || [],
        features: row.features || [],
        experience_tags: row.experience_tags || [],
        min_group_size: row.min_group_size,
        max_group_size: row.max_group_size,
        booking_advance_days_min: row.booking_advance_days_min,
        booking_advance_days_max: row.booking_advance_days_max,
        cancellation_policy: (row.cancellation_policy as string) || '',
        pet_policy: (row.pet_policy as string) || '',
        ai_notes: '',
      };
    }
  }
  // TODO: Add hotel and restaurant cases

  return NextResponse.json({
    success: true,
    listing,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/partner/listing
 * Update partner's directory listing
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

  const body = BodySchema.parse(await request.json());

  // Update the linked entity
  if (profile.winery_id) {
    await prisma.$executeRaw`
      UPDATE wineries SET
        description = COALESCE(${body.description ?? null}, description),
        short_description = COALESCE(${body.short_description ?? null}, short_description),
        tasting_fee = COALESCE(${body.tasting_fee ?? null}, tasting_fee),
        reservation_required = COALESCE(${body.reservation_required ?? null}, reservation_required),
        hours_of_operation = COALESCE(${body.hours ? JSON.stringify(body.hours) : null}, hours_of_operation),
        specialties = COALESCE(${body.specialties || null}, specialties),
        amenities = COALESCE(${body.features || null}, amenities),
        experience_tags = COALESCE(${body.experience_tags || null}, experience_tags),
        min_group_size = ${body.min_group_size ?? null},
        max_group_size = ${body.max_group_size ?? null},
        booking_advance_days_min = ${body.booking_advance_days_min ?? null},
        booking_advance_days_max = ${body.booking_advance_days_max ?? null},
        cancellation_policy = ${body.cancellation_policy || null},
        pet_policy = ${body.pet_policy || null},
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ${profile.winery_id}`;
  }
  // TODO: Add hotel and restaurant cases

  // Log the activity
  await partnerService.logActivity(
    profile.id,
    'listing_updated',
    { fields: Object.keys(body) },
    getClientIp(request)
  );

  return NextResponse.json({
    success: true,
    message: 'Listing updated successfully',
    timestamp: new Date().toISOString(),
  });
}));
