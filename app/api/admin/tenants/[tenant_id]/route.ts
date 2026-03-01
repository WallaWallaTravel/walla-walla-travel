/**
 * Admin Tenant Detail API
 * GET /api/admin/tenants/[tenant_id] - Get tenant details
 * PATCH /api/admin/tenants/[tenant_id] - Update tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { validateBody } from '@/lib/api/middleware/validation';
import { tenantService } from '@/lib/services/tenant.service';
import { z } from 'zod';

// Schema for updating a tenant
const UpdateTenantSchema = z.object({
  legal_name: z.string().min(1).max(255).optional(),
  display_name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  stripe_account_id: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/admin/tenants/[tenant_id]
 * Get tenant details with brands
 */
export const GET = withAdminAuth(async (
  _request: NextRequest,
  _session: AuthSession,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { tenant_id } = await context!.params;
  const tenantId = parseInt(tenant_id, 10);

  const tenant = await tenantService.getTenantById(tenantId);
  const brands = await tenantService.getBrandsByTenant(tenantId);

  return NextResponse.json({
    success: true,
    data: {
      ...tenant,
      brands,
    },
  });
});

/**
 * PATCH /api/admin/tenants/[tenant_id]
 * Update a tenant
 */
export const PATCH = withAdminAuth(async (
  request: NextRequest,
  _session: AuthSession,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { tenant_id } = await context!.params;
  const tenantId = parseInt(tenant_id, 10);

  const data = await validateBody(request, UpdateTenantSchema);

  const tenant = await tenantService.updateTenant(tenantId, data);

  return NextResponse.json({
    success: true,
    data: tenant,
    message: 'Tenant updated successfully',
  });
});
