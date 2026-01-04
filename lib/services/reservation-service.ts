import { logger } from '@/lib/logger';
/**
 * Reservation Service
 * Handles "Reserve & Refine" booking flow
 * Optimized for deposit-only reservations
 */

import { BaseService } from './base.service';
import { NotFoundError } from '@/lib/api/middleware/error-handler';
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

export const CreateReservationSchema = z.object({
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10).max(20),
  partySize: z.number().int().min(1).max(50),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  alternateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eventType: z.string().optional(),
  specialRequests: z.string().optional(),
  depositAmount: z.number().min(0),
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
