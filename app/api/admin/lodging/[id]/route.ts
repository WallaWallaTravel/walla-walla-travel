import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import type { RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { lodgingService, UpdateLodgingSchema } from '@/lib/services/lodging.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/lodging/[id]
 * Get a single lodging property by ID (admin view, includes inactive)
 */
export const GET = withAdminAuth(async (request: NextRequest, _session, context) => {
  const { id } = await (context as RouteContext<{ id: string }>).params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid property ID',
    }, { status: 400 });
  }

  const property = await lodgingService.getById(numId);

  if (!property) {
    return NextResponse.json({
      success: false,
      error: 'Property not found',
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      property,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * PATCH /api/admin/lodging/[id]
 * Update a lodging property
 */
export const PATCH = withAdminAuth(async (request: NextRequest, _session, context) => {
  const { id } = await (context as RouteContext<{ id: string }>).params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid property ID',
    }, { status: 400 });
  }

  const body = await request.json();

  const parseResult = UpdateLodgingSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors,
    }, { status: 422 });
  }

  const property = await lodgingService.updateProperty(numId, parseResult.data);

  if (!property) {
    return NextResponse.json({
      success: false,
      error: 'Property not found',
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      property,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * DELETE /api/admin/lodging/[id]
 * Soft-delete (deactivate) a lodging property
 */
export const DELETE = withAdminAuth(async (request: NextRequest, _session, context) => {
  const { id } = await (context as RouteContext<{ id: string }>).params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid property ID',
    }, { status: 400 });
  }

  const success = await lodgingService.deactivate(numId);

  if (!success) {
    return NextResponse.json({
      success: false,
      error: 'Property not found or already inactive',
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      message: 'Property deactivated successfully',
    },
    timestamp: new Date().toISOString(),
  });
});
