/**
 * Admin Lunch Supplier Menus API Routes
 * GET  /api/admin/lunch-suppliers/[id]/menus - Get active menu with items
 * POST /api/admin/lunch-suppliers/[id]/menus - Create a new menu or add items to existing menu
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import type { RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { lunchSupplierService } from '@/lib/services/lunch-supplier.service';
import {
  CreateLunchMenuSchema,
  CreateLunchMenuItemSchema,
} from '@/lib/types/lunch-supplier';

interface RouteParams {
  id: string;
}

/**
 * GET /api/admin/lunch-suppliers/[id]/menus
 * Returns the active menu with items for a supplier.
 */
export const GET = withAdminAuth(
  async (
    _request: NextRequest,
    _session,
    context?: RouteContext
  ) => {
    const params = await context!.params as unknown as RouteParams;
    const supplierId = parseInt(params.id, 10);

    if (isNaN(supplierId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid supplier ID' },
        { status: 400 }
      );
    }

    const menu = await lunchSupplierService.getActiveMenuForSupplier(supplierId);

    return NextResponse.json({
      success: true,
      data: menu,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/admin/lunch-suppliers/[id]/menus
 * Body with `menu_name` creates a new menu.
 * Body with `menu_id` + item data adds an item to an existing menu.
 */
export const POST = withAdminAuth(
  async (
    request: NextRequest,
    _session,
    context?: RouteContext
  ) => {
    const params = await context!.params as unknown as RouteParams;
    const supplierId = parseInt(params.id, 10);

    if (isNaN(supplierId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid supplier ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // If body contains `menu_id`, add an item to an existing menu
    if (body.menu_id) {
      const menuId = parseInt(body.menu_id, 10);
      if (isNaN(menuId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid menu_id' },
          { status: 400 }
        );
      }

      const parseResult = CreateLunchMenuItemSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid menu item data',
            details: parseResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const item = await lunchSupplierService.addMenuItem(
        menuId,
        parseResult.data
      );

      return NextResponse.json(
        {
          success: true,
          data: item,
          message: 'Menu item added',
        },
        { status: 201 }
      );
    }

    // Otherwise, create a new menu
    const parseResult = CreateLunchMenuSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid menu data',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const menu = await lunchSupplierService.createMenu(
      supplierId,
      parseResult.data
    );

    return NextResponse.json(
      {
        success: true,
        data: menu,
        message: 'Menu created successfully',
      },
      { status: 201 }
    );
  }
);
