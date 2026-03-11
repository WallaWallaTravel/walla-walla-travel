import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateBody } from '@/lib/api/middleware/validation';

const MenuItemSchema = z.object({
  category: z.string().max(100).optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().min(0),
  dietary_tags: z.array(z.string()).optional(),
  is_available: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const CreateMenuSchema = z.object({
  name: z.string().min(1).max(255),
  supplier_id: z.number().int().positive().nullable().optional(),
  items: z.array(MenuItemSchema).min(1, 'At least one menu item is required'),
});

// GET /api/admin/menus — list all active saved menus with items
export const GET = withAdminAuth(async () => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT sm.id, sm.name, sm.supplier_id, sm.is_active, sm.created_at, sm.updated_at,
       COALESCE(
         json_agg(
           json_build_object(
             'id', smi.id,
             'category', smi.category,
             'name', smi.name,
             'description', smi.description,
             'price', smi.price,
             'dietary_tags', smi.dietary_tags,
             'is_available', smi.is_available,
             'sort_order', smi.sort_order
           ) ORDER BY smi.sort_order, smi.id
         ) FILTER (WHERE smi.id IS NOT NULL),
         '[]'::json
       ) AS items
     FROM saved_menus sm
     LEFT JOIN saved_menu_items smi ON smi.saved_menu_id = sm.id
     WHERE sm.is_active = true
     GROUP BY sm.id
     ORDER BY sm.name`;

  return NextResponse.json({ success: true, data: rows });
});

// POST /api/admin/menus — create a new saved menu with items
export const POST =
  withAdminAuth(async (request) => {
    const data = await validateBody(request, CreateMenuSchema);

    // Insert menu
    const menuRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO saved_menus (name, supplier_id) VALUES (${data.name}, ${data.supplier_id || null}) RETURNING *`;
    const menu = menuRows[0];

    // Insert items
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      await prisma.$executeRaw`
        INSERT INTO saved_menu_items (saved_menu_id, category, name, description, price, dietary_tags, is_available, sort_order)
         VALUES (${menu.id}, ${item.category || null}, ${item.name}, ${item.description || null}, ${item.price}, ${item.dietary_tags || []}, ${item.is_available !== false}, ${item.sort_order ?? i})`;
    }

    // Fetch full menu with items
    const fullRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT sm.*,
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
       WHERE sm.id = ${menu.id}
       GROUP BY sm.id`;

    return NextResponse.json({ success: true, data: fullRows[0] }, { status: 201 });
  });
