import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { query } from '@/lib/db';
import { z } from 'zod';
import { validateBody } from '@/lib/api/middleware/validation';
import type { RouteContext } from '@/lib/api/middleware/auth-wrapper';

const MenuItemSchema = z.object({
  id: z.number().int().optional(),
  category: z.string().max(100).optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().min(0),
  dietary_tags: z.array(z.string()).optional(),
  is_available: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const UpdateMenuSchema = z.object({
  name: z.string().min(1).max(255),
  supplier_id: z.number().int().positive().nullable().optional(),
  items: z.array(MenuItemSchema).min(1, 'At least one menu item is required'),
});

// PUT /api/admin/menus/[id] — update menu and replace items
export const PUT = withCSRF(
  withAdminAuth(async (request, _session, context?: RouteContext) => {
    const { id } = await context!.params;
    const menuId = parseInt(id);
    const data = await validateBody(request, UpdateMenuSchema);

    // Check menu exists
    const existing = await query(
      `SELECT id FROM saved_menus WHERE id = $1 AND is_active = true`,
      [menuId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Menu not found' }, { status: 404 });
    }

    // Update menu
    await query(
      `UPDATE saved_menus SET name = $1, supplier_id = $2 WHERE id = $3`,
      [data.name, data.supplier_id || null, menuId]
    );

    // Replace items: delete old, insert new
    await query(`DELETE FROM saved_menu_items WHERE saved_menu_id = $1`, [menuId]);

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      await query(
        `INSERT INTO saved_menu_items (saved_menu_id, category, name, description, price, dietary_tags, is_available, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          menuId,
          item.category || null,
          item.name,
          item.description || null,
          item.price,
          item.dietary_tags || [],
          item.is_available !== false,
          item.sort_order ?? i,
        ]
      );
    }

    // Fetch updated menu
    const fullResult = await query(
      `SELECT sm.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id', smi.id, 'category', smi.category, 'name', smi.name,
               'description', smi.description, 'price', smi.price,
               'dietary_tags', smi.dietary_tags, 'is_available', smi.is_available,
               'sort_order', smi.sort_order
             ) ORDER BY smi.sort_order, smi.id
           ) FILTER (WHERE smi.id IS NOT NULL), '[]'::json
         ) AS items
       FROM saved_menus sm
       LEFT JOIN saved_menu_items smi ON smi.saved_menu_id = sm.id
       WHERE sm.id = $1
       GROUP BY sm.id`,
      [menuId]
    );

    return NextResponse.json({ success: true, data: fullResult.rows[0] });
  })
);

// DELETE /api/admin/menus/[id] — soft delete
export const DELETE = withCSRF(
  withAdminAuth(async (_request, _session, context?: RouteContext) => {
    const { id } = await context!.params;
    const menuId = parseInt(id);

    const result = await query(
      `UPDATE saved_menus SET is_active = false WHERE id = $1 AND is_active = true RETURNING id`,
      [menuId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Menu not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  })
);
