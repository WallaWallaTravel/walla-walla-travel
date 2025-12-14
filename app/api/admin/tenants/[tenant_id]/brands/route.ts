/**
 * Admin Tenant Brands API
 * GET /api/admin/tenants/[tenant_id]/brands - List brands for a tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { tenantService } from '@/lib/services/tenant.service';

interface RouteParams {
  params: Promise<{ tenant_id: string }>;
}

/**
 * GET /api/admin/tenants/[tenant_id]/brands
 * List all brands for a tenant
 */
export const GET = withErrorHandling(async (
  _request: NextRequest,
  { params }: RouteParams
) => {
  const { tenant_id } = await params;
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




