/**
 * Shared Tour Service
 *
 * @module lib/services/shared-tour.service
 * @description Manages the shared/group wine tour program with ticketed sales.
 * Allows individual guests to join scheduled group tours at per-person pricing.
 *
 * @businessRules
 * - Tours available Sunday-Wednesday only
 * - Per-person pricing: $95 base, $115 with lunch option
 * - Maximum capacity per tour (typically 12-14 guests)
 * - Ticketed sales model (vs private charter)
 *
 * @features
 * - Tour schedule management
 * - Ticket sales and availability tracking
 * - Lunch upgrade options
 * - Guest manifest generation
 *
 * @see migrations/038-shared-tours-system.sql - Database schema
 */

import { query } from '@/lib/db';
import { SHARED_TOUR_RATES } from '@/lib/types/pricing-models';

// ============================================================================
// TYPES
// ============================================================================

export interface SharedTourSchedule {
  id: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  max_guests: number;
  min_guests: number;
  base_price_per_person: number;
  lunch_price_per_person: number;
  lunch_included_default: boolean;
  title: string;
  description: string | null;
  meeting_location: string | null;
  wineries_preview: string[] | null;
  status: 'open' | 'full' | 'confirmed' | 'cancelled' | 'completed';
  is_published: boolean;
  booking_cutoff_hours: number;
  cancellation_cutoff_hours: number;
  driver_id: string | null;
  vehicle_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SharedTourWithAvailability extends SharedTourSchedule {
  tickets_sold: number;
  spots_available: number;
  revenue: number;
  minimum_met: boolean;
  booking_cutoff_at: string;
  accepting_bookings: boolean;
}

export interface SharedTourTicket {
  id: string;
  tour_id: string;
  ticket_number: string;
  ticket_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  guest_names: string[] | null;
  includes_lunch: boolean;
  price_per_person: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'refunded' | 'partial_refund';
  payment_method: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  status: 'confirmed' | 'cancelled' | 'no_show' | 'attended';
  check_in_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_amount: number | null;
  dietary_restrictions: string | null;
  special_requests: string | null;
  referral_source: string | null;
  promo_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketRequest {
  tour_id: string;
  ticket_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  guest_names?: string[];
  includes_lunch?: boolean;
  dietary_restrictions?: string;
  special_requests?: string;
  referral_source?: string;
  promo_code?: string;
}

export interface CreateTourRequest {
  tour_date: string;
  start_time?: string;
  duration_hours?: number;
  max_guests?: number;
  min_guests?: number;
  base_price_per_person?: number;
  lunch_price_per_person?: number;
  lunch_included_default?: boolean;
  title?: string;
  description?: string;
  meeting_location?: string;
  wineries_preview?: string[];
  booking_cutoff_hours?: number;
  is_published?: boolean;
  notes?: string;
}

// ============================================================================
// TOUR SCHEDULE OPERATIONS
// ============================================================================

export const sharedTourService = {
  /**
   * Get all upcoming shared tours with availability info
   */
  async getUpcomingTours(): Promise<SharedTourWithAvailability[]> {
    const result = await query<SharedTourWithAvailability>(`
      SELECT * FROM shared_tours_availability
      ORDER BY tour_date, start_time
    `);
    return result.rows;
  },

  /**
   * Get a single tour by ID
   */
  async getTourById(tourId: string): Promise<SharedTourSchedule | null> {
    const result = await query<SharedTourSchedule>(`
      SELECT * FROM shared_tour_schedule
      WHERE id = $1
    `, [tourId]);
    return result.rows[0] || null;
  },

  /**
   * Get a tour with availability info
   */
  async getTourWithAvailability(tourId: string): Promise<SharedTourWithAvailability | null> {
    const result = await query<SharedTourWithAvailability>(`
      SELECT * FROM shared_tours_availability
      WHERE id = $1
    `, [tourId]);
    return result.rows[0] || null;
  },

  /**
   * Get tours for a specific date range
   */
  async getToursInRange(startDate: string, endDate: string): Promise<SharedTourWithAvailability[]> {
    const result = await query<SharedTourWithAvailability>(`
      SELECT * FROM shared_tours_availability
      WHERE tour_date >= $1 AND tour_date <= $2
      ORDER BY tour_date, start_time
    `, [startDate, endDate]);
    return result.rows;
  },

  /**
   * Create a new shared tour date
   */
  async createTour(data: CreateTourRequest): Promise<SharedTourSchedule> {
    const result = await query<SharedTourSchedule>(`
      INSERT INTO shared_tour_schedule (
        tour_date,
        start_time,
        duration_hours,
        max_guests,
        min_guests,
        base_price_per_person,
        lunch_price_per_person,
        lunch_included_default,
        title,
        description,
        meeting_location,
        wineries_preview,
        booking_cutoff_hours,
        is_published,
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *
    `, [
      data.tour_date,
      data.start_time || '10:00:00',
      data.duration_hours || 6,
      data.max_guests || 14,
      data.min_guests || 2,
      data.base_price_per_person || SHARED_TOUR_RATES.base.perPersonRate,
      data.lunch_price_per_person || SHARED_TOUR_RATES.withLunch.perPersonRate,
      data.lunch_included_default ?? true,
      data.title || 'Walla Walla Wine Tour Experience',
      data.description || null,
      data.meeting_location || 'Downtown Walla Walla - exact location provided upon booking',
      data.wineries_preview || null,
      data.booking_cutoff_hours || 48,
      data.is_published ?? true,
      data.notes || null,
    ]);
    return result.rows[0];
  },

  /**
   * Update a tour
   */
  async updateTour(tourId: string, data: Partial<CreateTourRequest>): Promise<SharedTourSchedule | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.tour_date !== undefined) {
      updates.push(`tour_date = $${paramCount++}`);
      values.push(data.tour_date);
    }
    if (data.start_time !== undefined) {
      updates.push(`start_time = $${paramCount++}`);
      values.push(data.start_time);
    }
    if (data.duration_hours !== undefined) {
      updates.push(`duration_hours = $${paramCount++}`);
      values.push(data.duration_hours);
    }
    if (data.max_guests !== undefined) {
      updates.push(`max_guests = $${paramCount++}`);
      values.push(data.max_guests);
    }
    if (data.min_guests !== undefined) {
      updates.push(`min_guests = $${paramCount++}`);
      values.push(data.min_guests);
    }
    if (data.base_price_per_person !== undefined) {
      updates.push(`base_price_per_person = $${paramCount++}`);
      values.push(data.base_price_per_person);
    }
    if (data.lunch_price_per_person !== undefined) {
      updates.push(`lunch_price_per_person = $${paramCount++}`);
      values.push(data.lunch_price_per_person);
    }
    if (data.lunch_included_default !== undefined) {
      updates.push(`lunch_included_default = $${paramCount++}`);
      values.push(data.lunch_included_default);
    }
    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.meeting_location !== undefined) {
      updates.push(`meeting_location = $${paramCount++}`);
      values.push(data.meeting_location);
    }
    if (data.wineries_preview !== undefined) {
      updates.push(`wineries_preview = $${paramCount++}`);
      values.push(data.wineries_preview);
    }
    if (data.booking_cutoff_hours !== undefined) {
      updates.push(`booking_cutoff_hours = $${paramCount++}`);
      values.push(data.booking_cutoff_hours);
    }
    if (data.is_published !== undefined) {
      updates.push(`is_published = $${paramCount++}`);
      values.push(data.is_published);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(data.notes);
    }

    if (updates.length === 0) {
      return this.getTourById(tourId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(tourId);

    const result = await query<SharedTourSchedule>(`
      UPDATE shared_tour_schedule
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    return result.rows[0] || null;
  },

  /**
   * Cancel a tour
   */
  async cancelTour(tourId: string): Promise<SharedTourSchedule | null> {
    const result = await query<SharedTourSchedule>(`
      UPDATE shared_tour_schedule
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [tourId]);
    return result.rows[0] || null;
  },

  /**
   * Assign driver and vehicle to a tour
   */
  async assignResources(tourId: string, driverId: string | null, vehicleId: string | null): Promise<SharedTourSchedule | null> {
    const result = await query<SharedTourSchedule>(`
      UPDATE shared_tour_schedule
      SET driver_id = $2, vehicle_id = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [tourId, driverId, vehicleId]);
    return result.rows[0] || null;
  },

  // ============================================================================
  // TICKET OPERATIONS
  // ============================================================================

  /**
   * Check availability for a tour
   */
  async checkAvailability(tourId: string, requestedTickets: number): Promise<{
    available: boolean;
    spots_remaining: number;
    reason: string;
  }> {
    const result = await query<{ available: boolean; spots_remaining: number; reason: string }>(`
      SELECT * FROM check_shared_tour_availability($1, $2)
    `, [tourId, requestedTickets]);
    return result.rows[0];
  },

  /**
   * Calculate ticket price
   */
  async calculatePrice(tourId: string, ticketCount: number, includesLunch: boolean = true): Promise<{
    price_per_person: number;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
  }> {
    const result = await query<{
      price_per_person: number;
      subtotal: number;
      tax_amount: number;
      total_amount: number;
    }>(`
      SELECT * FROM calculate_ticket_price($1, $2, $3)
    `, [tourId, ticketCount, includesLunch]);
    return result.rows[0];
  },

  /**
   * Create a ticket purchase
   */
  async createTicket(data: CreateTicketRequest): Promise<SharedTourTicket> {
    // First check availability
    const availability = await this.checkAvailability(data.tour_id, data.ticket_count);
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    // Calculate price
    const includesLunch = data.includes_lunch ?? true;
    const pricing = await this.calculatePrice(data.tour_id, data.ticket_count, includesLunch);

    const result = await query<SharedTourTicket>(`
      INSERT INTO shared_tour_tickets (
        tour_id,
        ticket_count,
        customer_name,
        customer_email,
        customer_phone,
        guest_names,
        includes_lunch,
        price_per_person,
        subtotal,
        tax_amount,
        total_amount,
        dietary_restrictions,
        special_requests,
        referral_source,
        promo_code
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *
    `, [
      data.tour_id,
      data.ticket_count,
      data.customer_name,
      data.customer_email,
      data.customer_phone || null,
      data.guest_names || null,
      includesLunch,
      pricing.price_per_person,
      pricing.subtotal,
      pricing.tax_amount,
      pricing.total_amount,
      data.dietary_restrictions || null,
      data.special_requests || null,
      data.referral_source || null,
      data.promo_code || null,
    ]);
    return result.rows[0];
  },

  /**
   * Get tickets for a tour
   */
  async getTicketsForTour(tourId: string): Promise<SharedTourTicket[]> {
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE tour_id = $1
      ORDER BY created_at
    `, [tourId]);
    return result.rows;
  },

  /**
   * Get a ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE id = $1
    `, [ticketId]);
    return result.rows[0] || null;
  },

  /**
   * Get a ticket by ticket number
   */
  async getTicketByNumber(ticketNumber: string): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE ticket_number = $1
    `, [ticketNumber]);
    return result.rows[0] || null;
  },

  /**
   * Get tickets by customer email
   */
  async getTicketsByEmail(email: string): Promise<SharedTourTicket[]> {
    const result = await query<SharedTourTicket>(`
      SELECT * FROM shared_tour_tickets
      WHERE customer_email = $1
      ORDER BY created_at DESC
    `, [email]);
    return result.rows;
  },

  /**
   * Mark ticket as paid
   */
  async markTicketPaid(ticketId: string, paymentMethod: string, stripePaymentIntentId?: string): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      UPDATE shared_tour_tickets
      SET
        payment_status = 'paid',
        payment_method = $2,
        stripe_payment_intent_id = $3,
        paid_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [ticketId, paymentMethod, stripePaymentIntentId || null]);
    return result.rows[0] || null;
  },

  /**
   * Cancel a ticket
   */
  async cancelTicket(ticketId: string, reason: string, refundAmount?: number): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      UPDATE shared_tour_tickets
      SET
        status = 'cancelled',
        payment_status = CASE WHEN $3 IS NOT NULL THEN 'refunded' ELSE payment_status END,
        cancelled_at = NOW(),
        cancellation_reason = $2,
        refund_amount = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [ticketId, reason, refundAmount || null]);
    return result.rows[0] || null;
  },

  /**
   * Check in a ticket
   */
  async checkInTicket(ticketId: string): Promise<SharedTourTicket | null> {
    const result = await query<SharedTourTicket>(`
      UPDATE shared_tour_tickets
      SET
        status = 'attended',
        check_in_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [ticketId]);
    return result.rows[0] || null;
  },

  /**
   * Get guest manifest for a tour
   */
  async getTourManifest(tourId: string): Promise<Record<string, unknown>[]> {
    const result = await query(`
      SELECT * FROM shared_tour_manifest
      WHERE tour_id = $1
      ORDER BY customer_name
    `, [tourId]);
    return result.rows;
  },

  // ============================================================================
  // REPORTING
  // ============================================================================

  /**
   * Get tour statistics for a date range
   */
  async getTourStats(startDate: string, endDate: string): Promise<{
    total_tours: number;
    total_tickets_sold: number;
    total_revenue: number;
    average_guests_per_tour: number;
    tours_that_ran: number;
    cancelled_tours: number;
  }> {
    const result = await query(`
      SELECT
        COUNT(*)::INTEGER as total_tours,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(ticket_count), 0) FROM shared_tour_tickets WHERE tour_id = st.id AND status = 'confirmed' AND payment_status = 'paid')
        ), 0)::INTEGER as total_tickets_sold,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(total_amount), 0) FROM shared_tour_tickets WHERE tour_id = st.id AND payment_status = 'paid')
        ), 0)::DECIMAL as total_revenue,
        ROUND(
          COALESCE(AVG(
            (SELECT COALESCE(SUM(ticket_count), 0) FROM shared_tour_tickets WHERE tour_id = st.id AND status = 'confirmed' AND payment_status = 'paid')
          ), 0), 1
        )::DECIMAL as average_guests_per_tour,
        COUNT(*) FILTER (WHERE st.status = 'completed')::INTEGER as tours_that_ran,
        COUNT(*) FILTER (WHERE st.status = 'cancelled')::INTEGER as cancelled_tours
      FROM shared_tour_schedule st
      WHERE st.tour_date >= $1 AND st.tour_date <= $2
    `, [startDate, endDate]);
    return result.rows[0];
  },
};

export default sharedTourService;
