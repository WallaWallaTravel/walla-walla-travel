/**
 * Client-Facing Lunch Ordering API Routes
 * GET  /api/my-trip/[token]/lunch - Get lunch orders with menu data
 * POST /api/my-trip/[token]/lunch - Submit/update a lunch order
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
import { SubmitLunchOrderSchema } from '@/lib/types/lunch-supplier';

interface RouteParams {
  token: string;
}

/**
 * GET /api/my-trip/[token]/lunch
 * Returns all lunch orders for the proposal. For active (draft/submitted) orders,
 * also includes the supplier's active menu items so the client can make selections.
 */
export const GET = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token } = await context.params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      throw new NotFoundError('Trip not found');
    }

    const orders = await lunchSupplierService.getOrdersForProposal(proposal.id);

    // For each active order, include the supplier's menu items
    const ordersWithMenus = await Promise.all(
      orders.map(async (order) => {
        // Only include menu data for orders where the client can still edit
        const canEdit = order.status === 'draft' || order.status === 'submitted';
        let menuItems = null;

        if (canEdit) {
          const menu = await lunchSupplierService.getActiveMenuForSupplier(
            order.supplier_id
          );
          menuItems = menu?.items ?? [];
        }

        // Check ordering status
        const orderingStatus = await lunchSupplierService.isOrderingOpen(order.id);

        return {
          ...order,
          menu_items: menuItems,
          ordering_open: orderingStatus.open,
          ordering_reason: orderingStatus.reason,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        orders: ordersWithMenus,
        planning_phase: proposal.planning_phase,
      },
    });
  }
);

/**
 * POST /api/my-trip/[token]/lunch
 * Submit or update a lunch order.
 * Body: { order_id: number, guest_orders: [...], special_requests?: string }
 */
export const POST = withErrorHandling<unknown, RouteParams>(
  async (request: NextRequest, context: RouteContext<RouteParams>) => {
    const { token } = await context.params;

    const proposal = await tripProposalService.getByAccessToken(token);
    if (!proposal) {
      throw new NotFoundError('Trip not found');
    }

    const body = await request.json();
    const orderId = body.order_id;

    if (!orderId || typeof orderId !== 'number') {
      throw new BadRequestError('order_id is required');
    }

    // Verify the order belongs to this proposal
    const order = await lunchSupplierService.getOrder(orderId);
    if (!order || order.trip_proposal_id !== proposal.id) {
      throw new NotFoundError('Lunch order not found');
    }

    // Validate the submission data
    const parseResult = SubmitLunchOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid order data',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Check cutoff enforcement
    const orderingStatus = await lunchSupplierService.isOrderingOpen(orderId);
    if (!orderingStatus.open) {
      throw new BadRequestError(
        orderingStatus.reason || 'Ordering is closed for this lunch'
      );
    }

    const updatedOrder = await lunchSupplierService.submitOrder(
      orderId,
      parseResult.data
    );

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Lunch order submitted successfully',
    });
  }
);
