/**
 * Lunch Supplier Service
 *
 * @module lib/services/lunch-supplier.service
 * @description Handles lunch supplier management, menu CRUD, and per-proposal
 * lunch ordering with cutoff enforcement and supplier communication.
 */

import { BaseService } from './base.service';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { EmailSupplierAdapter } from './supplier-adapters/email-adapter';
import {
  LunchSupplier,
  LunchMenu,
  LunchMenuItem,
  ProposalLunchOrder,
  CreateLunchSupplierInput,
  CreateLunchMenuInput,
  CreateLunchMenuItemInput,
  SubmitLunchOrderInput,
  CreateLunchSupplierSchema,
  CreateLunchMenuSchema,
  CreateLunchMenuItemSchema,
  SubmitLunchOrderSchema,
} from '@/lib/types/lunch-supplier';

// ============================================================================
// Lunch Supplier Service
// ============================================================================

class LunchSupplierService extends BaseService {
  protected get serviceName() {
    return 'LunchSupplierService';
  }

  // ==========================================================================
  // Supplier CRUD
  // ==========================================================================

  /**
   * Create a new lunch supplier
   */
  async createSupplier(input: CreateLunchSupplierInput): Promise<LunchSupplier> {
    const validated = CreateLunchSupplierSchema.parse(input);

    return this.insert<LunchSupplier>('lunch_suppliers', {
      name: validated.name,
      restaurant_id: validated.restaurant_id ?? null,
      contact_name: validated.contact_name ?? null,
      contact_email: validated.contact_email || null,
      contact_phone: validated.contact_phone ?? null,
      order_method: validated.order_method,
      api_endpoint: validated.api_endpoint || null,
      api_credentials: JSON.stringify({}),
      default_cutoff_hours: validated.default_cutoff_hours,
      large_group_cutoff_hours: validated.large_group_cutoff_hours,
      large_group_threshold: validated.large_group_threshold,
      closed_days: JSON.stringify(validated.closed_days),
      is_active: true,
      notes: validated.notes ?? null,
    });
  }

  /**
   * Get a supplier by ID
   */
  async getSupplier(id: number): Promise<LunchSupplier | null> {
    return this.findById<LunchSupplier>('lunch_suppliers', id);
  }

  /**
   * List all suppliers, optionally filtered to active only
   */
  async listSuppliers(activeOnly?: boolean): Promise<LunchSupplier[]> {
    if (activeOnly) {
      return this.findWhere<LunchSupplier>(
        'lunch_suppliers',
        'is_active = $1',
        [true],
        '*',
        'name ASC'
      );
    }
    return this.queryMany<LunchSupplier>(
      'SELECT * FROM lunch_suppliers ORDER BY name ASC'
    );
  }

  /**
   * Update a supplier
   */
  async updateSupplier(
    id: number,
    data: Partial<CreateLunchSupplierInput>
  ): Promise<LunchSupplier> {
    const existing = await this.getSupplier(id);
    if (!existing) {
      throw new NotFoundError('Supplier not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.restaurant_id !== undefined) updateData.restaurant_id = data.restaurant_id;
    if (data.contact_name !== undefined) updateData.contact_name = data.contact_name;
    if (data.contact_email !== undefined) updateData.contact_email = data.contact_email || null;
    if (data.contact_phone !== undefined) updateData.contact_phone = data.contact_phone;
    if (data.order_method !== undefined) updateData.order_method = data.order_method;
    if (data.api_endpoint !== undefined) updateData.api_endpoint = data.api_endpoint || null;
    if (data.default_cutoff_hours !== undefined) updateData.default_cutoff_hours = data.default_cutoff_hours;
    if (data.large_group_cutoff_hours !== undefined) updateData.large_group_cutoff_hours = data.large_group_cutoff_hours;
    if (data.large_group_threshold !== undefined) updateData.large_group_threshold = data.large_group_threshold;
    if (data.closed_days !== undefined) updateData.closed_days = JSON.stringify(data.closed_days);
    if (data.notes !== undefined) updateData.notes = data.notes;

    updateData.updated_at = new Date().toISOString();

    const result = await this.update<LunchSupplier>('lunch_suppliers', id, updateData);
    if (!result) {
      throw new NotFoundError('Supplier not found');
    }
    return result;
  }

  // ==========================================================================
  // Menu CRUD
  // ==========================================================================

  /**
   * Create a new menu for a supplier. Deactivates any other active menus for this supplier.
   */
  async createMenu(
    supplierId: number,
    input: CreateLunchMenuInput
  ): Promise<LunchMenu> {
    const validated = CreateLunchMenuSchema.parse(input);

    const supplier = await this.getSupplier(supplierId);
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    return this.withTransaction(async () => {
      // Deactivate other active menus for this supplier
      await this.query(
        'UPDATE lunch_menus SET is_active = false WHERE supplier_id = $1 AND is_active = true',
        [supplierId]
      );

      return this.insert<LunchMenu>('lunch_menus', {
        supplier_id: supplierId,
        name: validated.name,
        is_active: true,
        valid_from: validated.valid_from ?? null,
        valid_until: validated.valid_until ?? null,
      });
    });
  }

  /**
   * Get a menu with all its items
   */
  async getMenuWithItems(menuId: number): Promise<LunchMenu | null> {
    const menu = await this.findById<LunchMenu>('lunch_menus', menuId);
    if (!menu) return null;

    const items = await this.findWhere<LunchMenuItem>(
      'lunch_menu_items',
      'menu_id = $1 AND is_available = true',
      [menuId],
      '*',
      'category ASC, sort_order ASC, name ASC'
    );

    return { ...menu, items };
  }

  /**
   * Get the current active menu (with items) for a supplier
   */
  async getActiveMenuForSupplier(supplierId: number): Promise<LunchMenu | null> {
    const menu = await this.queryOne<LunchMenu>(
      `SELECT * FROM lunch_menus
       WHERE supplier_id = $1 AND is_active = true
       ORDER BY created_at DESC LIMIT 1`,
      [supplierId]
    );
    if (!menu) return null;

    const items = await this.findWhere<LunchMenuItem>(
      'lunch_menu_items',
      'menu_id = $1 AND is_available = true',
      [menu.id],
      '*',
      'category ASC, sort_order ASC, name ASC'
    );

    return { ...menu, items };
  }

  // ==========================================================================
  // Menu Item CRUD
  // ==========================================================================

  /**
   * Add an item to a menu
   */
  async addMenuItem(
    menuId: number,
    input: CreateLunchMenuItemInput
  ): Promise<LunchMenuItem> {
    const validated = CreateLunchMenuItemSchema.parse(input);

    const menu = await this.findById<LunchMenu>('lunch_menus', menuId);
    if (!menu) {
      throw new NotFoundError('Menu not found');
    }

    return this.insert<LunchMenuItem>('lunch_menu_items', {
      menu_id: menuId,
      category: validated.category,
      name: validated.name,
      description: validated.description ?? null,
      price: validated.price,
      dietary_tags: JSON.stringify(validated.dietary_tags),
      is_available: true,
      sort_order: validated.sort_order,
    });
  }

  /**
   * Update a menu item
   */
  async updateMenuItem(
    itemId: number,
    data: Partial<CreateLunchMenuItemInput>
  ): Promise<LunchMenuItem> {
    const existing = await this.findById<LunchMenuItem>('lunch_menu_items', itemId);
    if (!existing) {
      throw new NotFoundError('Menu item not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.category !== undefined) updateData.category = data.category;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.dietary_tags !== undefined) updateData.dietary_tags = JSON.stringify(data.dietary_tags);
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order;

    const result = await this.update<LunchMenuItem>('lunch_menu_items', itemId, updateData);
    if (!result) {
      throw new NotFoundError('Menu item not found');
    }
    return result;
  }

  /**
   * Remove a menu item (soft delete by setting is_available = false)
   */
  async removeMenuItem(itemId: number): Promise<void> {
    const result = await this.update('lunch_menu_items', itemId, {
      is_available: false,
    });
    if (!result) {
      throw new NotFoundError('Menu item not found');
    }
  }

  // ==========================================================================
  // Order Management
  // ==========================================================================

  /**
   * Create a lunch order for a proposal day
   */
  async createOrder(
    proposalId: number,
    dayId: number | null,
    supplierId: number,
    partySize: number
  ): Promise<ProposalLunchOrder> {
    const supplier = await this.getSupplier(supplierId);
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    // Get tour date/time from the proposal day if available
    let tourDate: string | null = null;
    const tourTime = '10:00';
    if (dayId) {
      const day = await this.queryOne<{ date: string }>(
        'SELECT date FROM trip_proposal_days WHERE id = $1',
        [dayId]
      );
      if (day) {
        tourDate = day.date;
      }
    }

    // If we have a tour date, calculate cutoff
    let cutoffAt: Date | null = null;
    if (tourDate) {
      cutoffAt = this.calculateCutoff(supplier, tourDate, tourTime, partySize);
    }

    return this.insert<ProposalLunchOrder>('proposal_lunch_orders', {
      trip_proposal_id: proposalId,
      trip_proposal_day_id: dayId,
      supplier_id: supplierId,
      guest_orders: JSON.stringify([]),
      special_requests: null,
      subtotal: 0,
      tax: 0,
      total: 0,
      cutoff_at: cutoffAt ? cutoffAt.toISOString() : null,
      status: 'draft',
      sent_to_supplier_at: null,
      supplier_confirmed_at: null,
      supplier_reference: null,
    });
  }

  /**
   * Get all lunch orders for a proposal
   */
  async getOrdersForProposal(proposalId: number): Promise<ProposalLunchOrder[]> {
    const orders = await this.queryMany<ProposalLunchOrder>(
      `SELECT o.*,
        row_to_json(s.*) as supplier,
        CASE WHEN o.trip_proposal_day_id IS NOT NULL THEN
          (SELECT row_to_json(d.*) FROM (
            SELECT id, day_number, date, title
            FROM trip_proposal_days WHERE id = o.trip_proposal_day_id
          ) d)
        ELSE NULL END as day
      FROM proposal_lunch_orders o
      LEFT JOIN lunch_suppliers s ON s.id = o.supplier_id
      WHERE o.trip_proposal_id = $1
      ORDER BY o.created_at ASC`,
      [proposalId]
    );

    return orders;
  }

  /**
   * Get a single lunch order by ID
   */
  async getOrder(orderId: number): Promise<ProposalLunchOrder | null> {
    return this.queryOne<ProposalLunchOrder>(
      `SELECT o.*,
        row_to_json(s.*) as supplier,
        CASE WHEN o.trip_proposal_day_id IS NOT NULL THEN
          (SELECT row_to_json(d.*) FROM (
            SELECT id, day_number, date, title
            FROM trip_proposal_days WHERE id = o.trip_proposal_day_id
          ) d)
        ELSE NULL END as day
      FROM proposal_lunch_orders o
      LEFT JOIN lunch_suppliers s ON s.id = o.supplier_id
      WHERE o.id = $1`,
      [orderId]
    );
  }

  /**
   * Submit a lunch order with guest selections.
   * Validates that the order is in draft status and cutoff hasn't passed.
   */
  async submitOrder(
    orderId: number,
    input: SubmitLunchOrderInput
  ): Promise<ProposalLunchOrder> {
    const validated = SubmitLunchOrderSchema.parse(input);

    const order = await this.getOrder(orderId);
    if (!order) {
      throw new NotFoundError('Lunch order not found');
    }

    if (order.status !== 'draft' && order.status !== 'submitted') {
      throw new BadRequestError(
        `Order cannot be updated in "${order.status}" status`
      );
    }

    // Check cutoff
    if (order.cutoff_at && new Date(order.cutoff_at) < new Date()) {
      throw new BadRequestError(
        'The ordering deadline has passed. Please contact us for assistance.'
      );
    }

    // Look up item prices from the menu to calculate subtotal
    const allItemIds = validated.guest_orders.flatMap((go) =>
      go.items.map((item) => item.item_id)
    );
    const uniqueItemIds = [...new Set(allItemIds)];

    let priceMap = new Map<number, number>();
    if (uniqueItemIds.length > 0) {
      const placeholders = uniqueItemIds.map((_, i) => `$${i + 1}`).join(',');
      const items = await this.queryMany<{ id: number; price: number }>(
        `SELECT id, price FROM lunch_menu_items WHERE id IN (${placeholders})`,
        uniqueItemIds
      );
      priceMap = new Map(items.map((item) => [item.id, item.price]));
    }

    // Enrich guest orders with prices and calculate subtotal
    let subtotal = 0;
    const enrichedGuestOrders = validated.guest_orders.map((go) => ({
      ...go,
      items: go.items.map((item) => {
        const price = priceMap.get(item.item_id) ?? 0;
        subtotal += price * item.qty;
        return { ...item, price };
      }),
    }));

    // Tax rate: use WA state sales tax (no separate lunch tax configured)
    const taxRate = 0.091;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const result = await this.update<ProposalLunchOrder>(
      'proposal_lunch_orders',
      orderId,
      {
        guest_orders: JSON.stringify(enrichedGuestOrders),
        special_requests: validated.special_requests ?? null,
        subtotal,
        tax,
        total,
        status: 'submitted',
        updated_at: new Date().toISOString(),
      }
    );

    if (!result) {
      throw new NotFoundError('Lunch order not found');
    }
    return result;
  }

  /**
   * Send the order to the supplier using the appropriate adapter
   */
  async sendOrderToSupplier(orderId: number): Promise<ProposalLunchOrder> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new NotFoundError('Lunch order not found');
    }

    if (order.status !== 'submitted') {
      throw new BadRequestError(
        'Order must be in "submitted" status to send to supplier'
      );
    }

    const supplier = await this.getSupplier(order.supplier_id);
    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    // Get proposal number for reference
    const proposal = await this.queryOne<{ proposal_number: string }>(
      'SELECT proposal_number FROM trip_proposals WHERE id = $1',
      [order.trip_proposal_id]
    );
    const proposalNumber = proposal?.proposal_number || `#${order.trip_proposal_id}`;

    // Use the appropriate adapter based on order_method
    const adapter = new EmailSupplierAdapter();
    await adapter.sendOrder(order, supplier, proposalNumber);

    const result = await this.update<ProposalLunchOrder>(
      'proposal_lunch_orders',
      orderId,
      {
        status: 'sent_to_supplier',
        sent_to_supplier_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    if (!result) {
      throw new NotFoundError('Lunch order not found');
    }
    return result;
  }

  /**
   * Confirm the order, optionally with a supplier reference number
   */
  async confirmOrder(
    orderId: number,
    reference?: string
  ): Promise<ProposalLunchOrder> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new NotFoundError('Lunch order not found');
    }

    const result = await this.update<ProposalLunchOrder>(
      'proposal_lunch_orders',
      orderId,
      {
        status: 'confirmed',
        supplier_confirmed_at: new Date().toISOString(),
        supplier_reference: reference ?? null,
        updated_at: new Date().toISOString(),
      }
    );

    if (!result) {
      throw new NotFoundError('Lunch order not found');
    }
    return result;
  }

  /**
   * Cancel a lunch order
   */
  async cancelOrder(orderId: number): Promise<ProposalLunchOrder> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new NotFoundError('Lunch order not found');
    }

    if (order.status === 'cancelled') {
      throw new BadRequestError('Order is already cancelled');
    }

    const result = await this.update<ProposalLunchOrder>(
      'proposal_lunch_orders',
      orderId,
      {
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      }
    );

    if (!result) {
      throw new NotFoundError('Lunch order not found');
    }
    return result;
  }

  // ==========================================================================
  // Cutoff Logic
  // ==========================================================================

  /**
   * Check whether ordering is still open for a given order
   */
  async isOrderingOpen(
    orderId: number
  ): Promise<{ open: boolean; cutoff_at: string | null; reason?: string }> {
    const order = await this.getOrder(orderId);
    if (!order) {
      return { open: false, cutoff_at: null, reason: 'Order not found' };
    }

    if (order.status !== 'draft') {
      return {
        open: false,
        cutoff_at: order.cutoff_at,
        reason: `Order is in "${order.status}" status`,
      };
    }

    if (order.cutoff_at && new Date(order.cutoff_at) < new Date()) {
      return {
        open: false,
        cutoff_at: order.cutoff_at,
        reason: 'The ordering deadline has passed',
      };
    }

    // Check if supplier is closed on the tour day
    if (order.day?.date) {
      const supplier = await this.getSupplier(order.supplier_id);
      if (supplier) {
        const tourDayOfWeek = new Date(order.day.date).getDay();
        const closedDays = Array.isArray(supplier.closed_days)
          ? supplier.closed_days
          : [];
        if (closedDays.includes(tourDayOfWeek)) {
          return {
            open: false,
            cutoff_at: order.cutoff_at,
            reason: `Supplier is closed on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tourDayOfWeek]}s`,
          };
        }
      }
    }

    return { open: true, cutoff_at: order.cutoff_at };
  }

  /**
   * Calculate the ordering cutoff datetime based on supplier config and party size.
   * cutoff = tour date + tour time - cutoff_hours
   */
  private calculateCutoff(
    supplier: LunchSupplier,
    tourDate: string,
    tourTime: string,
    partySize: number
  ): Date {
    const threshold = supplier.large_group_threshold || 8;
    const cutoffHours =
      partySize >= threshold
        ? supplier.large_group_cutoff_hours || 72
        : supplier.default_cutoff_hours || 48;

    // Combine date + time into a datetime
    const tourDateTime = new Date(`${tourDate}T${tourTime}:00`);
    const cutoff = new Date(tourDateTime.getTime() - cutoffHours * 60 * 60 * 1000);

    return cutoff;
  }
}

export const lunchSupplierService = new LunchSupplierService();
