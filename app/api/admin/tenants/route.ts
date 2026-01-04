/**
 * Admin Tenants API
 * GET /api/admin/tenants - List all tenants
 * POST /api/admin/tenants - Create a new tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { tenantService, CreateTenantData } from '@/lib/services/tenant.service';
import { z } from 'zod';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit';

// Schema for creating a tenant
const CreateTenantSchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  legal_name: z.string().min(1).max(255),
  display_name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  is_platform_owner: z.boolean().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

/**
 * GET /api/admin/tenants
 * List all tenants
 */
export const GET = withErrorHandling(async () => {
  const tenants = await tenantService.listTenants();

  return NextResponse.json({
    success: true,
    data: tenants,
    count: tenants.length,
  });
});

/**
 * POST /api/admin/tenants
 * Create a new tenant
 */
export const POST = withCSRF(
  withRateLimit(rateLimiters.api)(
    withErrorHandling(async (request: NextRequest) => {
  const data = await validateBody<CreateTenantData>(request, CreateTenantSchema);

  const tenant = await tenantService.createTenant(data);

  return NextResponse.json({
    success: true,
    data: tenant,
    message: `Tenant '${tenant.display_name}' created successfully`,
  }, { status: 201 });
})));







