/**
 * Admin: Import Businesses
 * Handle CSV/JSON import of business data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';
import { businessDirectoryService, BusinessImportRow, BusinessType } from '@/lib/services/business-directory.service';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Schema for validating import rows
const ImportRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  business_type: z.enum(['winery', 'restaurant', 'hotel', 'boutique', 'gallery', 'activity', 'other']),
  address: z.string().optional(),
  city: z.string().optional().default('Walla Walla'),
  state: z.string().optional().default('WA'),
  zip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  short_description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const ImportRequestSchema = z.object({
  businesses: z.array(ImportRowSchema).min(1, 'At least one business is required'),
  fileName: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/directory/import
 * Import businesses from JSON data
 *
 * Body: {
 *   businesses: Array<BusinessImportRow>,
 *   fileName?: string,
 *   notes?: string
 * }
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const body = await request.json();

  // Validate request
  const parsed = ImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestError(`Validation error: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`);
  }

  const { businesses, fileName, notes } = parsed.data;

  // Start import batch
  const batch = await businessDirectoryService.startImportBatch(
    fileName || 'manual_import',
    'json',
    session.user.id,
    notes
  );

  // Import businesses
  const result = await businessDirectoryService.importBusinesses(
    businesses as BusinessImportRow[],
    batch.batch_id,
    session.user.id
  );

  return NextResponse.json({
    success: true,
    batchId: batch.batch_id,
    imported: result.imported,
    skipped: result.skipped,
    duplicates: result.duplicates,
    errors: result.errors,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/admin/directory/import
 * Get import batch history
 */
export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  const session = await getSessionFromRequest(request);

  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const batchId = searchParams.get('batchId');

  if (batchId) {
    // Get specific batch
    const batch = await businessDirectoryService.getImportBatch(batchId);
    if (!batch) {
      throw new BadRequestError('Import batch not found');
    }
    return NextResponse.json({ success: true, batch });
  }

  // Get all batches
  const batches = await businessDirectoryService.getImportBatches(limit);

  return NextResponse.json({
    success: true,
    batches,
    count: batches.length,
    timestamp: new Date().toISOString(),
  });
});
