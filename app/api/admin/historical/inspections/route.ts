/**
 * Historical Inspections API
 *
 * POST /api/admin/historical/inspections - Create historical inspection entry
 * GET /api/admin/historical/inspections - List historical inspections
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { getSessionFromRequest } from '@/lib/auth/session';
import { inspectionService } from '@/lib/services/inspection.service';

// =============================================================================
// Validation Schemas
// =============================================================================

const CreateHistoricalInspectionSchema = z.object({
  driverId: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  type: z.enum(['pre_trip', 'post_trip', 'dvir']),
  originalDocumentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  startMileage: z.number().int().nonnegative().optional(),
  endMileage: z.number().int().nonnegative().optional(),
  inspectionData: z.object({
    items: z.record(z.string(), z.boolean()).default({}),
    signature: z.string().optional(),
    notes: z.string().optional(),
    fuelLevel: z.string().optional(),
    defectsFound: z.boolean().optional(),
    defectSeverity: z.enum(['none', 'minor', 'critical']).optional(),
    defectDescription: z.string().optional(),
  }),
  historicalSource: z.string().min(1).max(100),
  entryNotes: z.string().max(2000).optional(),
  documentUrl: z.string().url().optional(),
});

const ListHistoricalInspectionsSchema = z.object({
  driverId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  source: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// =============================================================================
// POST - Create historical inspection
// =============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify admin authentication
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  // Validate request body
  const body = await validateBody(request, CreateHistoricalInspectionSchema);

  // Create the historical inspection
  const inspection = await inspectionService.createHistoricalInspection({
    driverId: body.driverId,
    vehicleId: body.vehicleId,
    type: body.type,
    originalDocumentDate: body.originalDocumentDate,
    startMileage: body.startMileage,
    endMileage: body.endMileage,
    inspectionData: {
      items: body.inspectionData.items,
      signature: body.inspectionData.signature,
      notes: body.inspectionData.notes,
      fuelLevel: body.inspectionData.fuelLevel,
      defectsFound: body.inspectionData.defectsFound,
      defectSeverity: body.inspectionData.defectSeverity,
      defectDescription: body.inspectionData.defectDescription,
    },
    enteredBy: session.user.id,
    historicalSource: body.historicalSource,
    entryNotes: body.entryNotes,
    documentUrl: body.documentUrl,
  });

  return NextResponse.json(
    {
      success: true,
      data: inspection,
      message: 'Historical inspection created successfully',
    },
    { status: 201 }
  );
});

// =============================================================================
// GET - List historical inspections
// =============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Verify admin authentication
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const filters = ListHistoricalInspectionsSchema.parse(queryParams);

  // Get historical inspections
  const result = await inspectionService.getHistoricalInspections({
    driverId: filters.driverId,
    vehicleId: filters.vehicleId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    source: filters.source,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  });

  return NextResponse.json({
    success: true,
    data: result.data,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    },
  });
});
