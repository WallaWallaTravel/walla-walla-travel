/**
 * Hotel Partner Service
 *
 * @module lib/services/hotel-partner.service
 * @description Manages hotel partners who can book shared tour tickets for their guests.
 * Supports invitation-based registration and booking workflow.
 *
 * @features
 * - Hotel invitation and registration
 * - Guest booking on behalf of hotels
 * - Booking management and tracking
 * - Future commission support
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sharedTourService, CreateTicketRequest, SharedTourTicket } from './shared-tour.service';
import { sendSharedTourPaymentRequestEmail } from '@/lib/email/templates/shared-tour-payment-request';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// ============================================================================
// TYPES
// ============================================================================

export interface HotelPartner {
  id: string;
  name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  invite_token: string | null;
  invite_sent_at: string | null;
  registered_at: string | null;
  is_active: boolean;
  commission_rate: number;
  commission_type: 'none' | 'percentage' | 'flat';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HotelBooking {
  id: string;
  ticket_number: string;
  tour_id: string;
  tour_date: string;
  tour_title: string;
  customer_name: string;
  customer_email: string;
  ticket_count: number;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
}

export interface CreateHotelRequest {
  name: string;
  email: string;
  contact_name?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface BookGuestRequest {
  tour_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  ticket_count: number;
  guest_names?: string[];
  includes_lunch?: boolean;
  lunch_selection?: string;
  dietary_restrictions?: string;
  special_requests?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export const hotelPartnerService = {
  // ============================================================================
  // HOTEL MANAGEMENT
  // ============================================================================

  /**
   * Create a new hotel partner (admin only)
   */
  async createHotel(data: CreateHotelRequest): Promise<HotelPartner> {
    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    const result = await query<HotelPartner>(`
      INSERT INTO hotel_partners (name, email, contact_name, phone, address, notes, invite_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      data.name,
      data.email,
      data.contact_name || null,
      data.phone || null,
      data.address || null,
      data.notes || null,
      inviteToken,
    ]);

    return result.rows[0];
  },

  /**
   * Send invitation email to hotel partner
   */
  async inviteHotel(hotelId: string): Promise<boolean> {
    const hotel = await this.getHotelById(hotelId);
    if (!hotel) {
      throw new Error('Hotel not found');
    }

    if (hotel.registered_at) {
      throw new Error('Hotel is already registered');
    }

    // Generate new invite token if needed
    let inviteToken = hotel.invite_token;
    if (!inviteToken) {
      inviteToken = crypto.randomBytes(32).toString('hex');
      await query(`
        UPDATE hotel_partners SET invite_token = $2, updated_at = NOW()
        WHERE id = $1
      `, [hotelId, inviteToken]);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/partner-portal/register?token=${inviteToken}`;

    // Send invitation email
    const { sendEmail } = await import('@/lib/email');
    const sent = await sendEmail({
      to: hotel.email,
      subject: '🍷 You\'re Invited: Walla Walla Travel Partner Portal',
      html: generateInviteEmailHtml(hotel.name, hotel.contact_name, inviteUrl),
      text: generateInviteEmailText(hotel.name, hotel.contact_name, inviteUrl),
    });

    if (sent) {
      await query(`
        UPDATE hotel_partners SET invite_sent_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [hotelId]);
    }

    return sent;
  },

  /**
   * Register a hotel partner with password
   */
  async registerHotel(inviteToken: string, data: {
    password: string;
    contact_name?: string;
    phone?: string;
  }): Promise<HotelPartner | null> {
    // Find hotel by token
    const result = await query<HotelPartner>(`
      SELECT * FROM hotel_partners WHERE invite_token = $1
    `, [inviteToken]);

    const hotel = result.rows[0];
    if (!hotel) {
      return null;
    }

    if (hotel.registered_at) {
      return null;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Update hotel with password and mark as registered
    const updateResult = await query<HotelPartner>(`
      UPDATE hotel_partners
      SET password_hash = $2,
          contact_name = COALESCE($3, contact_name),
          phone = COALESCE($4, phone),
          registered_at = NOW(),
          invite_token = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [hotel.id, passwordHash, data.contact_name || null, data.phone || null]);

    logger.info('Hotel partner registered', { hotelId: hotel.id, hotelName: hotel.name });

    return updateResult.rows[0];
  },

  /**
   * Authenticate hotel partner
   */
  async authenticateHotel(email: string, password: string): Promise<HotelPartner | null> {
    const result = await query<HotelPartner & { password_hash: string }>(`
      SELECT * FROM hotel_partners WHERE email = $1 AND is_active = true
    `, [email]);

    const hotel = result.rows[0];
    if (!hotel || !hotel.password_hash || !hotel.registered_at) {
      return null;
    }

    const isValid = await bcrypt.compare(password, hotel.password_hash);
    if (!isValid) {
      return null;
    }

    // Return without password_hash
    const { password_hash: _password_hash, ...hotelData } = hotel;
    return hotelData;
  },

  /**
   * Get hotel by ID
   */
  async getHotelById(hotelId: string): Promise<HotelPartner | null> {
    const result = await query<HotelPartner>(`
      SELECT * FROM hotel_partners WHERE id = $1
    `, [hotelId]);
    return result.rows[0] || null;
  },

  /**
   * Get hotel by email
   */
  async getHotelByEmail(email: string): Promise<HotelPartner | null> {
    const result = await query<HotelPartner>(`
      SELECT * FROM hotel_partners WHERE email = $1
    `, [email]);
    return result.rows[0] || null;
  },

  /**
   * Get hotel by invite token
   */
  async getHotelByInviteToken(token: string): Promise<HotelPartner | null> {
    const result = await query<HotelPartner>(`
      SELECT * FROM hotel_partners WHERE invite_token = $1
    `, [token]);
    return result.rows[0] || null;
  },

  /**
   * List all hotel partners
   */
  async listHotels(activeOnly: boolean = false): Promise<HotelPartner[]> {
    const whereClause = activeOnly ? 'WHERE is_active = true' : '';
    const result = await query<HotelPartner>(`
      SELECT * FROM hotel_partners ${whereClause}
      ORDER BY name
    `);
    return result.rows;
  },

  /**
   * Update hotel partner
   */
  async updateHotel(hotelId: string, data: Partial<CreateHotelRequest> & { is_active?: boolean }): Promise<HotelPartner | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.contact_name !== undefined) {
      updates.push(`contact_name = $${paramCount++}`);
      values.push(data.contact_name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(data.address);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(data.notes);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      return this.getHotelById(hotelId);
    }

    updates.push('updated_at = NOW()');
    values.push(hotelId);

    const result = await query<HotelPartner>(`
      UPDATE hotel_partners
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  },

  // ============================================================================
  // HOTEL DASHBOARD
  // ============================================================================

  /**
   * Get upcoming tours for hotel dashboard
   */
  async getHotelDashboard(hotelId: string): Promise<{
    hotel: HotelPartner;
    upcomingTours: Array<{
      id: string;
      tour_date: string;
      start_time: string;
      title: string;
      spots_available: number;
      accepting_bookings: boolean;
    }>;
    recentBookings: HotelBooking[];
    stats: {
      total_bookings: number;
      total_guests: number;
      pending_payments: number;
    };
  }> {
    const hotel = await this.getHotelById(hotelId);
    if (!hotel) {
      throw new Error('Hotel not found');
    }

    // Get upcoming tours
    const toursResult = await query<{
      id: string;
      tour_date: string;
      start_time: string;
      title: string;
      spots_available: number;
      accepting_bookings: boolean;
    }>(`
      SELECT * FROM shared_tours_availability_view
      WHERE accepting_bookings = true
      ORDER BY tour_date, start_time
      LIMIT 10
    `);

    // Get recent bookings by this hotel
    const bookingsResult = await query<HotelBooking>(`
      SELECT
        t.id,
        t.ticket_number,
        t.shared_tour_id AS tour_id,
        st.tour_date,
        st.title AS tour_title,
        t.primary_guest_name AS customer_name,
        t.primary_guest_email AS customer_email,
        t.guest_count AS ticket_count,
        ROUND(t.total_price * 1.089, 2) AS total_amount,
        t.payment_status,
        t.status,
        t.created_at
      FROM shared_tours_tickets t
      JOIN shared_tours st ON st.id = t.shared_tour_id
      WHERE t.hotel_partner_id = $1
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [hotelId]);

    // Get stats
    const statsResult = await query<{
      total_bookings: string;
      total_guests: string;
      pending_payments: string;
    }>(`
      SELECT
        COUNT(*)::TEXT AS total_bookings,
        COALESCE(SUM(guest_count), 0)::TEXT AS total_guests,
        COUNT(*) FILTER (WHERE payment_status = 'pending')::TEXT AS pending_payments
      FROM shared_tours_tickets
      WHERE hotel_partner_id = $1 AND status != 'cancelled'
    `, [hotelId]);

    return {
      hotel,
      upcomingTours: toursResult.rows,
      recentBookings: bookingsResult.rows,
      stats: {
        total_bookings: parseInt(statsResult.rows[0]?.total_bookings || '0'),
        total_guests: parseInt(statsResult.rows[0]?.total_guests || '0'),
        pending_payments: parseInt(statsResult.rows[0]?.pending_payments || '0'),
      },
    };
  },

  // ============================================================================
  // BOOKING OPERATIONS
  // ============================================================================

  /**
   * Book a guest on behalf of a hotel
   * Creates ticket and sends payment request email to guest
   */
  async bookGuestForHotel(hotelId: string, data: BookGuestRequest): Promise<{
    ticket: SharedTourTicket;
    paymentUrl: string;
  }> {
    const hotel = await this.getHotelById(hotelId);
    if (!hotel) {
      throw new Error('Hotel not found');
    }

    if (!hotel.is_active) {
      throw new Error('Hotel account is not active');
    }

    // Create the ticket through shared tour service
    const ticketRequest: CreateTicketRequest = {
      tour_id: data.tour_id,
      ticket_count: data.ticket_count,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      guest_names: data.guest_names,
      includes_lunch: data.includes_lunch,
      lunch_selection: data.lunch_selection,
      dietary_restrictions: data.dietary_restrictions,
      special_requests: data.special_requests,
      hotel_partner_id: hotelId,
      booked_by_hotel: true,
    };

    const ticket = await sharedTourService.createTicket(ticketRequest);

    // Update ticket to mark as booked by hotel
    await query(`
      UPDATE shared_tours_tickets
      SET hotel_partner_id = $2, booked_by_hotel = true, updated_at = NOW()
      WHERE id = $1
    `, [ticket.id, hotelId]);

    // Generate payment URL
    const paymentUrl = await sharedTourService.createPaymentLink(ticket.id);

    // Send payment request email to guest
    try {
      await sendSharedTourPaymentRequestEmail(ticket.id, hotel.name);
      logger.info('Payment request email sent', {
        ticketId: ticket.id,
        hotelId,
        customerEmail: data.customer_email,
      });
    } catch (error) {
      logger.error('Failed to send payment request email', {
        ticketId: ticket.id,
        error,
      });
    }

    return {
      ticket,
      paymentUrl,
    };
  },

  /**
   * Get all bookings made by a hotel
   */
  async getHotelBookings(hotelId: string, options?: {
    status?: string;
    paymentStatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    bookings: HotelBooking[];
    total: number;
  }> {
    const conditions: string[] = ['t.hotel_partner_id = $1'];
    const values: unknown[] = [hotelId];
    let paramCount = 2;

    if (options?.status) {
      conditions.push(`t.status = $${paramCount++}`);
      values.push(options.status);
    }
    if (options?.paymentStatus) {
      conditions.push(`t.payment_status = $${paramCount++}`);
      values.push(options.paymentStatus);
    }

    const whereClause = conditions.join(' AND ');
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Get total count
    const countResult = await query<{ count: string }>(`
      SELECT COUNT(*) AS count
      FROM shared_tours_tickets t
      WHERE ${whereClause}
    `, values);

    // Get bookings
    const bookingsResult = await query<HotelBooking>(`
      SELECT
        t.id,
        t.ticket_number,
        t.shared_tour_id AS tour_id,
        st.tour_date,
        st.title AS tour_title,
        t.primary_guest_name AS customer_name,
        t.primary_guest_email AS customer_email,
        t.guest_count AS ticket_count,
        ROUND(t.total_price * 1.089, 2) AS total_amount,
        t.payment_status,
        t.status,
        t.created_at
      FROM shared_tours_tickets t
      JOIN shared_tours st ON st.id = t.shared_tour_id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `, [...values, limit, offset]);

    return {
      bookings: bookingsResult.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
    };
  },

  // ============================================================================
  // REPORTING
  // ============================================================================

  /**
   * Get hotel partner statistics (for admin)
   */
  async getHotelStats(hotelId?: string): Promise<{
    hotels: Array<{
      id: string;
      name: string;
      total_bookings: number;
      total_guests: number;
      total_revenue: number;
      pending_payments: number;
    }>;
  }> {
    const whereClause = hotelId ? 'WHERE hp.id = $1' : '';
    const values = hotelId ? [hotelId] : [];

    const result = await query<{
      id: string;
      name: string;
      total_bookings: string;
      total_guests: string;
      total_revenue: string;
      pending_payments: string;
    }>(`
      SELECT
        hp.id,
        hp.name,
        COUNT(t.id)::TEXT AS total_bookings,
        COALESCE(SUM(t.guest_count), 0)::TEXT AS total_guests,
        COALESCE(SUM(CASE WHEN t.payment_status = 'paid' THEN t.total_price * 1.089 ELSE 0 END), 0)::TEXT AS total_revenue,
        COUNT(t.id) FILTER (WHERE t.payment_status = 'pending')::TEXT AS pending_payments
      FROM hotel_partners hp
      LEFT JOIN shared_tours_tickets t ON t.hotel_partner_id = hp.id AND t.status != 'cancelled'
      ${whereClause}
      GROUP BY hp.id, hp.name
      ORDER BY total_bookings DESC
    `, values);

    return {
      hotels: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        total_bookings: parseInt(row.total_bookings),
        total_guests: parseInt(row.total_guests),
        total_revenue: parseFloat(row.total_revenue),
        pending_payments: parseInt(row.pending_payments),
      })),
    };
  },
};

// ============================================================================
// EMAIL HELPERS
// ============================================================================

function generateInviteEmailHtml(hotelName: string, contactName: string | null, inviteUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #8B1538 0%, #722F37 100%); padding: 40px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🍷 Partner Portal Invitation</h1>
          <p style="color: #fecaca; margin: 12px 0 0 0; font-size: 16px;">You're invited to join Walla Walla Travel</p>
        </div>

        <div style="padding: 32px 24px;">
          <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${contactName || hotelName},</p>

          <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            Welcome to the Walla Walla Travel Partner Portal! You can now book wine tours directly for your guests.
          </p>

          <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">🎉 As a partner, you can:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #1f2937; font-size: 14px; line-height: 1.8;">
              <li>View upcoming shared tour availability</li>
              <li>Book guests directly - they'll receive a payment link</li>
              <li>Track your bookings and guest payments</li>
              <li>Manage multiple guest reservations at once</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: #8B1538; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold;">Set Up Your Account</a>
          </div>

          <p style="font-size: 14px; color: #9ca3af; text-align: center;">
            Questions? Email us at info@wallawalla.travel or call (509) 200-8000
          </p>
        </div>

        <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">Walla Walla Travel</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0 0;">Your local wine country experts</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateInviteEmailText(hotelName: string, contactName: string | null, inviteUrl: string): string {
  return `
Partner Portal Invitation

Hi ${contactName || hotelName},

Welcome to the Walla Walla Travel Partner Portal! You can now book wine tours directly for your guests.

As a partner, you can:
- View upcoming shared tour availability
- Book guests directly - they'll receive a payment link
- Track your bookings and guest payments
- Manage multiple guest reservations at once

Set up your account here:
${inviteUrl}

Questions? Email us at info@wallawalla.travel or call (509) 200-8000

Walla Walla Travel
Your local wine country experts
  `.trim();
}

export default hotelPartnerService;
