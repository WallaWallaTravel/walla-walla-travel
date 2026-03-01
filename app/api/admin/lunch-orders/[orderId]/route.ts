/**
 * Admin Lunch Order Update
 * PATCH /api/admin/lunch-orders/[orderId]
 * Allows updating ordering_mode and other admin-editable fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, type AuthSession, type RouteContext } from '@/lib/api/middleware/auth-wrapper';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { lunchSupplierService } from '@/lib/services/lunch-supplier.service';
import { query } from '@/lib/db';
import { withCSRF } from '@/lib/api/middleware/csrf';
import { z } from 'zod';

const PatchBodySchema = z.object({
  ordering_mode: z.enum(['coordinator', 'individual']).optional(),
});

export const PATCH = withCSRF(
  withAdminAuth(
  async (request: NextRequest, _session: AuthSession, context?: RouteContext) => {
    const { orderId } = await context!.params;
    const orderIdNum = parseInt(orderId, 10);

    if (isNaN(orderIdNum)) {
      throw new BadRequestError('Invalid order ID');
    }

    const order = await lunchSupplierService.getOrder(orderIdNum);
    if (!order) {
      throw new NotFoundError('Lunch order not found');
    }

    const body = PatchBodySchema.parse(await request.json());
    const updates: Record<string, unknown> = {};

    if (body.ordering_mode) {
      updates.ordering_mode = body.ordering_mode;
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    // Build update query
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    setClauses.push('updated_at = NOW()');

    const result = await query(
      `UPDATE proposal_lunch_orders
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      [...values, orderIdNum]
    );

    if (!result.rows[0]) {
      throw new NotFoundError('Lunch order not found');
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  }
)
);
