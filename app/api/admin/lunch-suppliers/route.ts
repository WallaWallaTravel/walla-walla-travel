/**
 * Admin Lunch Suppliers API Routes
 * GET  /api/admin/lunch-suppliers - List all suppliers
 * POST /api/admin/lunch-suppliers - Create a new supplier
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { lunchSupplierService } from '@/lib/services/lunch-supplier.service';
import { CreateLunchSupplierSchema } from '@/lib/types/lunch-supplier';

/**
 * GET /api/admin/lunch-suppliers
 * List all lunch suppliers. Supports `active_only=true` query param.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get('active_only') === 'true';

  const suppliers = await lunchSupplierService.listSuppliers(activeOnly);

  return NextResponse.json({
    success: true,
    data: suppliers,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/admin/lunch-suppliers
 * Create a new lunch supplier
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  const body = await request.json();

  const parseResult = CreateLunchSupplierSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const supplier = await lunchSupplierService.createSupplier(parseResult.data);

  return NextResponse.json(
    {
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
    },
    { status: 201 }
  );
});
