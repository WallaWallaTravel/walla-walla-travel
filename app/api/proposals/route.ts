/**
 * Proposals API
 * 
 * ✅ REFACTORED: Service layer handles business logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proposalService } from '@/lib/services/proposal.service';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

const BodySchema = z.object({
  brand_id: z.number().int().nullable().optional(),
  client_name: z.string().min(1).max(255),
  client_email: z.string().email(),
  client_phone: z.string().min(1).max(50),
  client_company: z.string().max(255).optional(),
  proposal_title: z.string().min(1).max(255),
  introduction: z.string().max(5000),
  wine_tour_description: z.string().max(5000).optional(),
  transfer_description: z.string().max(5000).optional(),
  wait_time_description: z.string().max(5000).optional(),
  special_notes: z.string().max(5000).optional(),
  cancellation_policy: z.string().max(5000).optional(),
  footer_notes: z.string().max(5000).optional(),
  service_items: z.array(z.object({
    name: z.string().min(1).max(255),
  }).passthrough()),
  additional_services: z.array(z.object({
    name: z.string().min(1).max(255),
    price: z.number(),
    quantity: z.number().int().positive().optional(),
  })).optional(),
  lunch_coordination: z.boolean().optional(),
  lunch_coordination_count: z.number().int().optional(),
  photography_package: z.boolean().optional(),
  discount_percentage: z.number().min(0).max(100),
  discount_reason: z.string().max(500).optional(),
  include_gratuity_request: z.boolean(),
  suggested_gratuity_percentage: z.number().min(0).max(100),
  gratuity_optional: z.boolean(),
  subtotal: z.number(),
  discount_amount: z.number(),
  total: z.number(),
  valid_until: z.string(),
  modules: z.object({
    corporate: z.boolean().optional(),
    multi_day: z.boolean().optional(),
    b2b: z.boolean().optional(),
    special_event: z.boolean().optional(),
    group_coordination: z.boolean().optional(),
  }).optional(),
  corporate_details: z.any().optional(),
  multi_day_itinerary: z.any().optional(),
  b2b_details: z.any().optional(),
  special_event_details: z.any().optional(),
  group_coordination: z.any().optional(),
}).passthrough();

/**
 * GET /api/proposals
 * List all proposals (admin)
 * 
 * ✅ REFACTORED: Service layer
 */
export const GET = withRateLimit(rateLimiters.api)(
  withAdminAuth(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);

    const result = await proposalService.list({
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });

    return NextResponse.json({
      success: true,
      data: result.proposals,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  }));

/**
 * POST /api/proposals
 * Create new proposal
 *
 * ✅ REFACTORED: Service layer handles validation & creation
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withAdminAuth(async (request: NextRequest) => {
  const data = BodySchema.parse(await request.json());

  const proposal = await proposalService.create(data as unknown as Parameters<typeof proposalService.create>[0]);

  return NextResponse.json({
    success: true,
    data: proposal,
    message: 'Proposal created successfully',
    timestamp: new Date().toISOString(),
  }, { status: 201 });
})));
