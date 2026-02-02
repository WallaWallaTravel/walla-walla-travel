/**
 * Admin Experience Requests API
 *
 * GET - List all experience requests with filtering
 * PATCH - Update experience request status, notes, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler';
import { experienceRequestService, UpdateExperienceRequestSchema } from '@/lib/services/experience-request.service';
import { logger } from '@/lib/logger';

// Query params schema for GET
const QuerySchema = z.object({
  status: z.enum(['new', 'contacted', 'in_progress', 'confirmed', 'declined', 'completed', 'cancelled']).optional(),
  brand: z.enum(['wwt', 'nwtc', 'hcwt']).optional(),
  source: z.enum(['website', 'chatgpt', 'phone', 'email', 'referral']).optional(),
  assigned_to: z.string().transform(Number).optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // Parse query params
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validation = QuerySchema.safeParse(queryParams);
  if (!validation.success) {
    throw new BadRequestError('Invalid query parameters');
  }

  const filters = validation.data;

  const { requests, total } = await experienceRequestService.findMany({
    status: filters.status,
    brand: filters.brand,
    source: filters.source,
    assignedTo: filters.assigned_to,
    fromDate: filters.from_date,
    toDate: filters.to_date,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  });

  logger.info('Admin fetched experience requests', {
    count: requests.length,
    total,
    filters,
  });

  return NextResponse.json({
    success: true,
    data: requests,
    meta: {
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    },
  });
});

// PATCH - Update a single experience request
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Validate ID is provided
  if (!body.id) {
    throw new BadRequestError('Request ID is required');
  }

  const id = parseInt(body.id);
  if (isNaN(id)) {
    throw new BadRequestError('Invalid request ID');
  }

  // Validate update data
  const { id: _id, ...updateData } = body;
  const validation = UpdateExperienceRequestSchema.safeParse(updateData);
  if (!validation.success) {
    const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('. ');
    throw new BadRequestError(`Invalid update data: ${errors}`);
  }

  const updated = await experienceRequestService.updateRequest(id, validation.data);

  if (!updated) {
    throw new NotFoundError('Experience request not found');
  }

  logger.info('Admin updated experience request', {
    id,
    updates: Object.keys(validation.data),
  });

  return NextResponse.json({
    success: true,
    data: updated,
  });
});
