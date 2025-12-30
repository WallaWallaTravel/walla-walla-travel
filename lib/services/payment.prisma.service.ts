import { logger } from '@/lib/logger';
/**
 * Payment Prisma Service
 *
 * Type-safe payment processing and tracking using Prisma ORM.
 * Replaces the raw SQL payment-service.ts for maintainable, type-safe operations.
 *
 * Financial operations use SERIALIZABLE isolation for data integrity.
 */

import { PrismaBaseService } from './prisma-base.service';
import { prisma, Prisma, payments } from '@/lib/prisma';
import { NotFoundError } from '@/lib/api/middleware/error-handler';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type Payment = payments;

export type PaymentWithRelations = Prisma.paymentsGetPayload<{
  include: {
    bookings: true;
    customers: true;
    reservations: true;
  };
}>;

export const CreatePaymentSchema = z.object({
  bookingId: z.number().int().positive().optional(),
  reservationId: z.number().int().positive().optional(),
  customerId: z.number().int().positive().optional(),
  amount: z.number().min(0),
  paymentMethod: z.string(),
  paymentType: z.string().default('charge'),
  stripePaymentIntentId: z.string().optional(),
  stripeChargeId: z.string().optional(),
  cardBrand: z.string().optional(),
  cardLast4: z.string().optional(),
  notes: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export interface PaymentStats {
  totalAmount: number;
  totalCount: number;
  avgAmount: number;
  byMethod: Array<{ method: string; count: number; total: number }>;
  byStatus: Array<{ status: string; count: number; total: number }>;
}

// ============================================================================
// Service Implementation
// ============================================================================

class PaymentPrismaService extends PrismaBaseService {
  protected get serviceName(): string {
    return 'PaymentService';
  }

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  /**
   * Create a new payment record
   * Uses SERIALIZABLE isolation for financial data integrity
   */
  async create(input: CreatePaymentInput): Promise<Payment> {
    this.log('Creating payment', { amount: input.amount, method: input.paymentMethod });

    const payment = await this.withTransaction(
      async (tx) => {
        const created = await tx.payments.create({
          data: {
            booking_id: input.bookingId || null,
            reservation_id: input.reservationId || null,
            customer_id: input.customerId || null,
            amount: new Prisma.Decimal(input.amount),
            payment_type: input.paymentType,
            payment_method: input.paymentMethod,
            stripe_payment_intent_id: input.stripePaymentIntentId || null,
            stripe_charge_id: input.stripeChargeId || null,
            card_brand: input.cardBrand || null,
            card_last4: input.cardLast4 || null,
            status: input.stripePaymentIntentId ? 'succeeded' : 'pending',
            succeeded_at: input.stripePaymentIntentId ? new Date() : null,
          },
        });

        // Audit log for financial operation
        await this.auditLog({
          actionType: 'PAYMENT_CREATED',
          entityType: 'payment',
          entityId: created.id,
          newState: {
            amount: input.amount,
            method: input.paymentMethod,
            status: created.status,
            bookingId: input.bookingId,
          },
        });

        return created;
      },
      'Serializable'
    );

    this.log('Payment created', { id: payment.id });
    return payment;
  }

  /**
   * Get payment by ID
   */
  async getById(id: number): Promise<Payment | null> {
    return this.db.payments.findUnique({
      where: { id },
    });
  }

  /**
   * Get payment by ID with all relations
   */
  async getByIdWithRelations(id: number): Promise<PaymentWithRelations | null> {
    return this.db.payments.findUnique({
      where: { id },
      include: {
        bookings: true,
        customers: true,
        reservations: true,
      },
    });
  }

  /**
   * Update payment status
   * Uses SERIALIZABLE isolation for financial data integrity
   */
  async updateStatus(
    id: number,
    status: string,
    options?: {
      stripePaymentIntentId?: string;
      stripeChargeId?: string;
      failureReason?: string;
    }
  ): Promise<Payment> {
    return this.withTransaction(
      async (tx) => {
        // Get current state for audit
        const current = await tx.payments.findUnique({ where: { id } });
        if (!current) {
          throw new NotFoundError('Payment', id.toString());
        }

        const updateData: Prisma.paymentsUpdateInput = {
          status,
          updated_at: new Date(),
        };

        if (options?.stripePaymentIntentId) {
          updateData.stripe_payment_intent_id = options.stripePaymentIntentId;
        }

        if (options?.stripeChargeId) {
          updateData.stripe_charge_id = options.stripeChargeId;
        }

        if (status === 'succeeded') {
          updateData.succeeded_at = new Date();
        } else if (status === 'failed') {
          updateData.failed_at = new Date();
          updateData.failure_reason = options?.failureReason || null;
        } else if (status === 'refunded') {
          updateData.refunded_at = new Date();
        }

        const updated = await tx.payments.update({
          where: { id },
          data: updateData,
        });

        // Audit log for status change
        await this.auditLog({
          actionType: 'PAYMENT_STATUS_CHANGED',
          entityType: 'payment',
          entityId: id,
          previousState: { status: current.status },
          newState: { status: updated.status },
        });

        return updated;
      },
      'Serializable'
    );
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get payments for a booking
   */
  async getByBookingId(bookingId: number): Promise<Payment[]> {
    return this.db.payments.findMany({
      where: { booking_id: bookingId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get payments for a reservation
   */
  async getByReservationId(reservationId: number): Promise<Payment[]> {
    return this.db.payments.findMany({
      where: { reservation_id: reservationId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get payments for a customer
   */
  async getByCustomerId(customerId: number): Promise<Payment[]> {
    return this.db.payments.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get payment by Stripe payment intent ID
   */
  async getByStripeIntentId(intentId: string): Promise<Payment | null> {
    return this.db.payments.findFirst({
      where: { stripe_payment_intent_id: intentId },
    });
  }

  /**
   * Get payment by Stripe charge ID
   */
  async getByStripeChargeId(chargeId: string): Promise<Payment | null> {
    return this.db.payments.findFirst({
      where: { stripe_charge_id: chargeId },
    });
  }

  // ============================================================================
  // Financial Calculations
  // ============================================================================

  /**
   * Calculate total paid for a booking
   */
  async getTotalPaidForBooking(bookingId: number): Promise<number> {
    const result = await this.db.payments.aggregate({
      where: {
        booking_id: bookingId,
        status: 'succeeded',
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount?.toNumber() || 0;
  }

  /**
   * Calculate total refunded for a booking
   */
  async getTotalRefundedForBooking(bookingId: number): Promise<number> {
    const result = await this.db.payments.aggregate({
      where: {
        booking_id: bookingId,
        status: 'refunded',
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount?.toNumber() || 0;
  }

  /**
   * Get payment statistics for a date range
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<PaymentStats> {
    const where: Prisma.paymentsWhereInput = {};

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    // Get aggregates
    const totals = await this.db.payments.aggregate({
      where: { ...where, status: 'succeeded' },
      _sum: { amount: true },
      _count: { id: true },
      _avg: { amount: true },
    });

    // Group by method
    const byMethod = await this.db.payments.groupBy({
      by: ['payment_method'],
      where: { ...where, status: 'succeeded' },
      _count: { id: true },
      _sum: { amount: true },
    });

    // Group by status
    const byStatus = await this.db.payments.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { amount: true },
    });

    return {
      totalAmount: totals._sum.amount?.toNumber() || 0,
      totalCount: totals._count.id || 0,
      avgAmount: totals._avg.amount?.toNumber() || 0,
      byMethod: byMethod.map((r) => ({
        method: r.payment_method,
        count: r._count.id,
        total: r._sum.amount?.toNumber() || 0,
      })),
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: r._count.id,
        total: r._sum.amount?.toNumber() || 0,
      })),
    };
  }

  // ============================================================================
  // Refund Operations
  // ============================================================================

  /**
   * Record a refund for a payment
   */
  async recordRefund(
    paymentId: number,
    stripeRefundId: string,
    refundAmount?: number
  ): Promise<Payment> {
    return this.withTransaction(
      async (tx) => {
        const payment = await tx.payments.findUnique({ where: { id: paymentId } });
        if (!payment) {
          throw new NotFoundError('Payment', paymentId.toString());
        }

        const updated = await tx.payments.update({
          where: { id: paymentId },
          data: {
            status: 'refunded',
            stripe_refund_id: stripeRefundId,
            refunded_at: new Date(),
            updated_at: new Date(),
          },
        });

        // Audit log for refund
        await this.auditLog({
          actionType: 'PAYMENT_REFUNDED',
          entityType: 'payment',
          entityId: paymentId,
          previousState: { status: payment.status },
          newState: {
            status: 'refunded',
            stripeRefundId,
            refundAmount: refundAmount || payment.amount.toNumber(),
          },
        });

        return updated;
      },
      'Serializable'
    );
  }

  // ============================================================================
  // List with Pagination
  // ============================================================================

  /**
   * List payments with filters and pagination
   */
  async list(options: {
    status?: string;
    paymentMethod?: string;
    bookingId?: number;
    customerId?: number;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const where: Prisma.paymentsWhereInput = {};

    if (options.status) where.status = options.status;
    if (options.paymentMethod) where.payment_method = options.paymentMethod;
    if (options.bookingId) where.booking_id = options.bookingId;
    if (options.customerId) where.customer_id = options.customerId;

    if (options.startDate || options.endDate) {
      where.created_at = {};
      if (options.startDate) where.created_at.gte = options.startDate;
      if (options.endDate) where.created_at.lte = options.endDate;
    }

    const { skip, take } = this.getPaginationParams(options);

    const [data, total] = await Promise.all([
      this.db.payments.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take,
        include: {
          bookings: { select: { id: true, booking_number: true } },
          customers: { select: { id: true, name: true, email: true } },
        },
      }),
      this.db.payments.count({ where }),
    ]);

    return this.createPaginatedResponse(data, total, options);
  }
}

// Export singleton instance
export const paymentPrismaService = new PaymentPrismaService();
