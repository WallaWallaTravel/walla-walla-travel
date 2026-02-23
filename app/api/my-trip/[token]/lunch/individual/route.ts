/**
 * Individual Guest Lunch Order API
 * POST /api/my-trip/[token]/lunch/individual
 * Allows a single guest to submit their own lunch order with JSONB merge + row locking
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  RouteContext,
  NotFoundError,
  BadRequestError,
} from '@/lib/api/middleware/error-handler';
import { tripProposalService } from '@/lib/services/trip-proposal.service';
import { lunchSupplierService } from '@/lib/services/lunch-supplier.service';
import { withTransaction } from '@/lib/db-helpers';
import { z } from 'zod';
import type { GuestOrder, GuestOrderItem } from '@/lib/types/lunch-supplier';

interface RouteParams {
  token: string;
}

const IndividualOrderItemSchema = z.object({
  item_id: z.number().int().positive(),
  name: z.string().min(1),
  qty: z.number().int().min(1).max(10),
});

const IndividualOrderSchema = z.object({
  order_id: z.number().int().positive(),
  guest_id: z.number().int().positive(),
  items: z.array(IndividualOrderItemSchema).min(1),
  notes: z.string().max(500).optional(),
});

export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token } = await context.params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      throw new NotFoundError('Trip not found');
    }

    const body = await request.json();
    const parseResult = IndividualOrderSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestError('Invalid order data');
    }

    const { order_id, guest_id, items, notes } = parseResult.data;

    // Verify the order belongs to this proposal
    const order = await lunchSupplierService.getOrder(order_id);
    if (!order || order.trip_proposal_id !== proposal.id) {
      throw new NotFoundError('Lunch order not found');
    }

    // Verify ordering mode is individual
    if (order.ordering_mode !== 'individual') {
      throw new BadRequestError('This order uses coordinator ordering mode');
    }

    // Check ordering is still open
    const orderingStatus = await lunchSupplierService.isOrderingOpen(order_id);
    if (!orderingStatus.open) {
      throw new BadRequestError(
        orderingStatus.reason || 'Ordering is closed for this lunch'
      );
    }

    // Verify guest belongs to this proposal
    const guest = (proposal.guests || []).find((g) => g.id === guest_id);
    if (!guest) {
      throw new NotFoundError('Guest not found in this trip');
    }

    // Look up item prices
    const allItemIds = items.map((item) => item.item_id);
    const uniqueItemIds = [...new Set(allItemIds)];
    let priceMap = new Map<number, number>();

    if (uniqueItemIds.length > 0) {
      const placeholders = uniqueItemIds.map((_, i) => `$${i + 1}`).join(',');
      const menuItems = await withTransaction(async (client) => {
        const result = await client.query<{ id: number; price: number }>(
          `SELECT id, price FROM lunch_menu_items WHERE id IN (${placeholders})`,
          uniqueItemIds
        );
        return result.rows;
      });
      priceMap = new Map(menuItems.map((item) => [item.id, item.price]));
    }

    // Build the guest's enriched order
    const enrichedItems: GuestOrderItem[] = items.map((item) => ({
      item_id: item.item_id,
      name: item.name,
      qty: item.qty,
      price: priceMap.get(item.item_id) ?? 0,
    }));

    const guestOrder: GuestOrder = {
      guest_name: guest.name,
      items: enrichedItems,
      notes: notes || undefined,
    };

    // Atomic JSONB merge with row locking
    const updatedOrder = await withTransaction(async (client) => {
      // Lock the row
      const lockResult = await client.query<{
        guest_orders: GuestOrder[] | string;
      }>(
        'SELECT guest_orders FROM proposal_lunch_orders WHERE id = $1 FOR UPDATE',
        [order_id]
      );

      if (!lockResult.rows[0]) {
        throw new NotFoundError('Lunch order not found');
      }

      // Parse existing guest orders
      let existingOrders: GuestOrder[] = [];
      const raw = lockResult.rows[0].guest_orders;
      if (typeof raw === 'string') {
        existingOrders = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        existingOrders = raw;
      }

      // Replace or add this guest's order
      const otherOrders = existingOrders.filter(
        (go) => go.guest_name !== guest.name
      );
      const mergedOrders = [...otherOrders, guestOrder];

      // Recalculate totals from all guest orders
      let subtotal = 0;
      for (const go of mergedOrders) {
        for (const item of go.items) {
          subtotal += (item.price ?? 0) * item.qty;
        }
      }

      const taxRate = 0.091;
      const tax = Math.round(subtotal * taxRate * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      // Update the order
      const updateResult = await client.query(
        `UPDATE proposal_lunch_orders
         SET guest_orders = $1, subtotal = $2, tax = $3, total = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [JSON.stringify(mergedOrders), subtotal, tax, total, order_id]
      );

      return updateResult.rows[0];
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Your lunch order has been submitted',
    });
  }
);
