/**
 * Admin: Single Business Management
 * Get, update, delete a specific business
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { businessDirectoryService, BusinessImportRow } from '@/lib/services/business-directory.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Schema for updating business
const UpdateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  business_type: z.enum(['winery', 'restaurant', 'hotel', 'boutique', 'gallery', 'activity', 'other']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  short_description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/directory/[id]
 * Get a specific business
 */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { id } = await params;
  const businessId = parseInt(id);

  if (isNaN(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const business = await businessDirectoryService.getById(businessId);

  if (!business) {
    throw new NotFoundError('Business not found');
  }

  return NextResponse.json({
    success: true,
    business,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/admin/directory/[id]
 * Update a business
 */
export const PATCH = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { id } = await params;
  const businessId = parseInt(id);

  if (isNaN(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  const body = await request.json();
  const parsed = UpdateBusinessSchema.safeParse(body);

  if (!parsed.success) {
    throw new BadRequestError(`Validation error: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`);
  }

  const business = await businessDirectoryService.updateBusiness(
    businessId,
    parsed.data as Partial<BusinessImportRow>,
    session.user.id
  );

  return NextResponse.json({
    success: true,
    business,
    timestamp: new Date().toISOString(),
  });
});

/**
 * DELETE /api/admin/directory/[id]
 * Hard delete a business
 */
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { id } = await params;
  const businessId = parseInt(id);

  if (isNaN(businessId)) {
    throw new BadRequestError('Invalid business ID');
  }

  await businessDirectoryService.deleteBusiness(businessId, session.user.id);

  return NextResponse.json({
    success: true,
    message: 'Business deleted',
    timestamp: new Date().toISOString(),
  });
});
