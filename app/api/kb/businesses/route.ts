/**
 * Knowledge Base Businesses API
 *
 * GET /api/kb/businesses - List all businesses
 * POST /api/kb/businesses - Create a new business
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody, validateQuery } from '@/lib/api/middleware/validation';
import { kbService, CreateBusinessSchema } from '@/lib/services/kb.service';
import { z } from 'zod';

// ============================================================================
// Query Schema
// ============================================================================

const GetBusinessesQuerySchema = z.object({
  type: z.string().optional(),
  verified: z.string().optional(),
});

// ============================================================================
// GET Handler - List businesses
// ============================================================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const query = validateQuery(request, GetBusinessesQuerySchema);

  const businesses = await kbService.getBusinesses({
    type: query.type,
    verified: query.verified === 'true' ? true : query.verified === 'false' ? false : undefined,
  });

  return NextResponse.json({
    success: true,
    data: businesses,
    count: businesses.length,
  });
});

// ============================================================================
// POST Handler - Create business
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const data = await validateBody(request, CreateBusinessSchema);

  const business = await kbService.createBusiness(data);

  return NextResponse.json({
    success: true,
    data: business,
    message: 'Business created successfully',
  });
});

