/**
 * Payment Service
 * Handles all payment processing and tracking
 */

import { BaseService, NotFoundError } from './base-service';
import { z } from 'zod';

export interface Payment {
  id: number;
  booking_id?: number;
  reservation_id?: number;
  customer_id: number;
  amount: number;
  payment_method: string;
  payment_status: string;
  stripe_payment_intent_id?: string;
  transaction_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const CreatePaymentSchema = z.object({
  bookingId: z.number().int().positive().optional(),
  reservationId: z.number().int().positive().optional(),
  customerId: z.number().int().positive(),
  amount: z.number().min(0),
  paymentMethod: z.string(),
  stripePaymentIntentId: z.string().optional(),
  notes: z.string().optional(),
});

export class PaymentService extends BaseService {
  constructor() {
    super('PaymentService');
  }

  async createPayment(data: z.infer<typeof CreatePaymentSchema>): Promise<Payment> {
    this.logInfo('Creating payment', { amount: data.amount });

    const payment = await this.create<Payment>('payments', {
      booking_id: data.bookingId || null,
      reservation_id: data.reservationId || null,
      customer_id: data.customerId,
      amount: data.amount,
      payment_method: data.paymentMethod,
      payment_status: data.stripePaymentIntentId ? 'completed' : 'pending',
      stripe_payment_intent_id: data.stripePaymentIntentId || null,
      transaction_date: new Date().toISOString(),
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.logInfo('Payment created', { id: payment.id });
    return payment;
  }

  async getPaymentsByBooking(bookingId: number): Promise<Payment[]> {
    const result = await this.query<Payment>(
      'SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC',
      [bookingId]
    );
    return result.rows;
  }

  async getPaymentsByReservation(reservationId: number): Promise<Payment[]> {
    const result = await this.query<Payment>(
      'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY created_at DESC',
      [reservationId]
    );
    return result.rows;
  }

  async getPaymentsByCustomer(customerId: number): Promise<Payment[]> {
    const result = await this.query<Payment>(
      'SELECT * FROM payments WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return result.rows;
  }

  async updatePaymentStatus(
    id: number, 
    status: string, 
    stripeIntentId?: string
  ): Promise<Payment> {
    const updated = await this.update<Payment>('payments', id, {
      payment_status: status,
      stripe_payment_intent_id: stripeIntentId || null,
      updated_at: new Date().toISOString(),
    });

    if (!updated) throw new NotFoundError('Payment', id.toString());
    return updated;
  }

  async getPaymentStats(startDate?: string, endDate?: string): Promise<{
    totalAmount: number;
    totalCount: number;
    avgAmount: number;
    byMethod: Array<{ method: string; count: number; total: number }>;
  }> {
    const whereClause = [];
    const params: string[] = [];

    if (startDate) {
      params.push(startDate);
      whereClause.push(`created_at >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      whereClause.push(`created_at <= $${params.length}`);
    }

    const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const totalsResult = await this.query<{
      total_amount: string;
      total_count: string;
      avg_amount: string;
    }>(
      `SELECT 
        SUM(amount) as total_amount,
        COUNT(*) as total_count,
        AVG(amount) as avg_amount
       FROM payments ${where}`,
      params
    );

    const byMethodResult = await this.query<{
      payment_method: string;
      count: string;
      total: string;
    }>(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total
       FROM payments ${where}
       GROUP BY payment_method`,
      params
    );

    const totals = totalsResult.rows[0];

    return {
      totalAmount: parseFloat(totals.total_amount || '0'),
      totalCount: parseInt(totals.total_count || '0', 10),
      avgAmount: parseFloat(totals.avg_amount || '0'),
      byMethod: byMethodResult.rows.map(r => ({
        method: r.payment_method,
        count: parseInt(r.count, 10),
        total: parseFloat(r.total),
      })),
    };
  }
}

export const paymentService = new PaymentService();


