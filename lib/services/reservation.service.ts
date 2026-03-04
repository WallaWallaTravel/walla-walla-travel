/**
 * Reservation Service
 * Handles "Reserve & Refine" booking flow
 * Optimized for deposit-only reservations
 */

import { BaseService } from './base.service';
import { NotFoundError, BadRequestError } from '@/lib/api/middleware/error-handler';
import { confirmPaymentSuccess } from '@/lib/stripe';
import { sendReservationConfirmation } from '@/lib/email';
import { crmSyncService } from '@/lib/services/crm-sync.service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export interface Reservation {
  id: number;
  reservation_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  preferred_date: string;
  alternate_date?: string;
  event_type?: string;
  special_requests?: string;
  deposit_amount: number;
  deposit_paid: boolean;
  payment_method: string;
  status: 'pending' | 'contacted' | 'confirmed' | 'completed' | 'cancelled';
  consultation_deadline: string;
  brand_id?: number;
  booking_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithCustomer extends Reservation {
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

export const CreateReservationSchema = z.object({
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(20),
  partySize: z.number().int().min(1).max(50),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  alternateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eventType: z.string().optional(),
  specialRequests: z.string().optional(),
  depositAmount: z.number().positive('Deposit amount must be greater than $0'),
  paymentMethod: z.enum(['card', 'check']),
  brandId: z.number().int().positive().optional(),
});

export class ReservationService extends BaseService {
  protected get serviceName(): string {
    return 'ReservationService';
  }

  async createReservation(data: z.infer<typeof CreateReservationSchema>): Promise<Reservation> {
    this.log('Creating reservation', { email: data.customerEmail });

    return await this.withTransaction(async () => {
      const customerId = await this.getOrCreateCustomer({
        email: data.customerEmail,
        name: data.customerName,
        phone: data.customerPhone,
      });

      const reservationNumber = `RES-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const reservation = await this.insert<Reservation>('reservations', {
        reservation_number: reservationNumber,
        customer_id: customerId,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone,
        party_size: data.partySize,
        preferred_date: data.preferredDate,
        alternate_date: data.alternateDate || null,
        event_type: data.eventType || null,
        special_requests: data.specialRequests || null,
        deposit_amount: data.depositAmount,
        deposit_paid: data.paymentMethod === 'card',
        payment_method: data.paymentMethod,
        status: 'pending',
        consultation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        brand_id: data.brandId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      this.log('Reservation created', { id: reservation.id });
      return reservation;
    });
  }

  /**
   * Get a single reservation by ID with joined customer data.
   * Returns the reservation with flat customer fields (customer_name, etc.)
   * plus a nested customer object for frontend compatibility.
   */
  async getById(id: number): Promise<ReservationWithCustomer> {
    const row = await this.queryOne<Reservation>(
      `SELECT
         r.*,
         c.name  AS customer_name,
         c.email AS customer_email,
         c.phone AS customer_phone
       FROM reservations r
       JOIN customers c ON r.customer_id = c.id
       WHERE r.id = $1`,
      [id]
    );

    if (!row) {
      throw new NotFoundError('Reservation', id.toString());
    }

    const withCustomer = row as ReservationWithCustomer;
    withCustomer.customer = {
      id: row.customer_id,
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    };

    return withCustomer;
  }

  /**
   * Confirm a Stripe payment for a reservation.
   * Verifies payment with Stripe, updates the reservation, sends confirmation
   * email, and logs to CRM. Mirrors the legacy confirm-payment route logic.
   */
  async confirmPayment(
    id: number,
    paymentIntentId: string
  ): Promise<{ reservationId: number; reservationNumber: string }> {
    const paymentSuccessful = await confirmPaymentSuccess(paymentIntentId);
    if (!paymentSuccessful) {
      throw new BadRequestError('Payment not confirmed');
    }

    const updated = await this.queryOne<Reservation>(
      `UPDATE reservations
       SET deposit_paid = true,
           payment_method = 'card',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (!updated) {
      throw new NotFoundError('Reservation', id.toString());
    }

    const customer = await this.queryOne<{
      id: number;
      name: string;
      email: string;
      phone: string;
    }>('SELECT id, name, email, phone FROM customers WHERE id = $1', [updated.customer_id]);

    if (customer) {
      const appUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      sendReservationConfirmation(
        {
          customer_name: customer.name,
          customer_email: customer.email,
          reservation_number: updated.reservation_number,
          party_size: updated.party_size,
          preferred_date: updated.preferred_date,
          alternate_date: updated.alternate_date,
          event_type: updated.event_type || 'Wine Tour',
          special_requests: updated.special_requests,
          deposit_amount: parseFloat(String(updated.deposit_amount)),
          payment_method: 'card',
          consultation_hours: 24,
          confirmation_url: `${appUrl}/book/reserve/confirmation?id=${updated.id}`,
        },
        customer.email,
        updated.brand_id ?? undefined
      ).catch((err: unknown) => {
        logger.error('Failed to send reservation confirmation email', {
          reservationId: id,
          error: err,
        });
      });

      crmSyncService
        .logPaymentReceived(
          customer.id,
          parseFloat(String(updated.deposit_amount)),
          'Deposit'
        )
        .catch((err: unknown) => {
          logger.error('Failed to log payment to CRM', {
            customerId: customer.id,
            error: err,
          });
        });
    }

    return {
      reservationId: updated.id,
      reservationNumber: updated.reservation_number,
    };
  }

  async findManyWithFilters(filters: {
    status?: string;
    customerId?: number;
    brandId?: number;
    includeCustomer?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ reservations: Reservation[]; total: number }> {
    const whereClause: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      params.push(filters.status);
      whereClause.push(`r.status = $${params.length}`);
    }

    if (filters.customerId) {
      params.push(filters.customerId);
      whereClause.push(`r.customer_id = $${params.length}`);
    }

    if (filters.brandId) {
      params.push(filters.brandId);
      whereClause.push(`r.brand_id = $${params.length}`);
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    let selectClause = 'r.*';
    let joinClause = '';

    if (filters.includeCustomer) {
      selectClause += `, JSON_BUILD_OBJECT('id', c.id, 'email', c.email, 'name', c.name, 'phone', c.phone) as customer`;
      joinClause = 'LEFT JOIN customers c ON r.customer_id = c.id';
    }

    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM reservations r ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const result = await this.query<Reservation>(
      `SELECT ${selectClause} FROM reservations r ${joinClause} ${where}
       ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return { reservations: result.rows, total };
  }

  async updateStatus(id: number, status: Reservation['status']): Promise<Reservation> {
    const updated = await this.update<Reservation>('reservations', id, {
      status,
      updated_at: new Date().toISOString()
    });
    if (!updated) throw new NotFoundError('Reservation', id.toString());
    return updated;
  }

  private async getOrCreateCustomer(data: { email: string; name: string; phone: string }): Promise<number> {
    const existing = await this.query<{ id: number }>(
      'SELECT id FROM customers WHERE LOWER(email) = LOWER($1)',
      [data.email]
    );

    if (existing.rows.length > 0) {
      await this.query(
        'UPDATE customers SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3',
        [data.name, data.phone, existing.rows[0].id]
      );
      return existing.rows[0].id;
    }

    const newCustomer = await this.insert<{ id: number }>('customers', {
      email: data.email,
      name: data.name,
      phone: data.phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return newCustomer.id;
  }
}

export const reservationService = new ReservationService();
