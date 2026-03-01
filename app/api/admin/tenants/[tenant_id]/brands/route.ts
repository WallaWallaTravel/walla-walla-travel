/**
 * Admin Tenant Brands API
 * GET /api/admin/tenants/[tenant_id]/brands - List brands for a tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper';
import { tenantService } from '@/lib/services/tenant.service';

/**
 * GET /api/admin/tenants/[tenant_id]/brands
 * List all brands for a tenant
 */
export const GET = withAdminAuth(async (
  _request: NextRequest,
  _session: AuthSession,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { tenant_id } = await context!.params;
  const tenantId = parseInt(tenant_id, 10);

  // Verify tenant exists
  await tenantService.getTenantById(tenantId);

  const brands = await tenantService.getBrandsByTenant(tenantId);

  return NextResponse.json({
    success: true,
    data: brands,
    count: brands.length,
  });
});
