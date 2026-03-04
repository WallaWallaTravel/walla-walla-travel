/**
 * Admin API: Update Pricing Tier
 * Update a specific pricing tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { updatePricingTier } from '@/lib/pricing/pricing-service';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const PatchBodySchema = z.object({
  changeReason: z.string().max(500).optional(),
  base_rate: z.number().positive().optional(),
  min_hours: z.number().positive().optional(),
  max_passengers: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
}).passthrough();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/pricing/tiers/[id]
 * Update a pricing tier
 */
export const PATCH = withCSRF(
  withAdminAuth(async (
  request: NextRequest,
  session,
  context
) => {
  const { id: idStr } = await context!.params;
  const id = parseInt(idStr);
  const body = PatchBodySchema.parse(await request.json());
  const { changeReason, ...updates } = body;

  await updatePricingTier(
    id,
    updates,
    parseInt(session.userId),
    changeReason || 'Admin update'
  );

  return NextResponse.json({
    success: true,
    message: 'Pricing tier updated'
  });
})
);
