/**
 * Refund Service
 *
 * Handles Stripe refund processing with cancellation policy logic.
 *
 * Cancellation Policy (NW Touring & Concierge):
 * - 45+ days before tour: 100% refund of deposit
 * - 21-44 days before tour: 50% refund of deposit
 * - Under 21 days: No refund of deposit
 */

import { BaseService } from './base.service';
import { logger } from '@/lib/logger';
import { getBrandStripeClient } from '@/lib/stripe-brands';

interface RefundResult {
  refundId: string | null;
  refundAmount: number;
  refundPercentage: number;
  policyApplied: string;
  stripeRefundId?: string;
}

export class RefundService extends BaseService {
  protected get serviceName(): string {
    return 'RefundService';
  }

  /**
   * Calculate refund amount based on cancellation policy
   */
  calculateRefund(tourDate: string | Date, depositAmount: number): {
    refundAmount: number;
    refundPercentage: number;
    policyApplied: string;
  } {
    // Use Date.UTC to count calendar days — avoids DST off-by-one errors
    const tour = typeof tourDate === 'string'
      ? (() => { const [y, m, d] = tourDate.split('-').map(Number); return { y, m: m - 1, d }; })()
      : { y: tourDate.getFullYear(), m: tourDate.getMonth(), d: tourDate.getDate() };
    const now = new Date();
    const tourUTC = Date.UTC(tour.y, tour.m, tour.d);
    const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const daysUntilTour = Math.round((tourUTC - nowUTC) / (1000 * 60 * 60 * 24));

    if (daysUntilTour >= 45) {
      return {
        refundAmount: depositAmount,
        refundPercentage: 100,
        policyApplied: `45+ days before tour (${daysUntilTour} days): Full refund`,
      };
    } else if (daysUntilTour >= 21) {
      return {
        refundAmount: Math.round(depositAmount * 50) / 100,
        refundPercentage: 50,
        policyApplied: `21-44 days before tour (${daysUntilTour} days): 50% refund`,
      };
    } else {
      return {
        refundAmount: 0,
        refundPercentage: 0,
        policyApplied: `Under 21 days before tour (${daysUntilTour} days): No refund`,
      };
    }
  }

  /**
   * Process refund for a cancelled booking
   * Finds the Stripe payment intent and issues refund based on policy
   */
  async processBookingRefund(bookingId: number): Promise<RefundResult> {
    this.log('Processing refund for booking', { bookingId });

    // Get booking details (including brand_id for brand-specific Stripe routing)
    const booking = await this.queryOne<{
      id: number;
      tour_date: string;
      deposit_amount: number;
      deposit_paid: boolean;
      status: string;
      brand_id: number | null;
    }>(
      `SELECT id, tour_date, deposit_amount, deposit_paid, status, brand_id
       FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (!booking) {
      this.warn('Booking not found for refund', { bookingId });
      return {
        refundId: null,
        refundAmount: 0,
        refundPercentage: 0,
        policyApplied: 'Booking not found',
      };
    }

    // Only refund if deposit was actually paid
    if (!booking.deposit_paid || !booking.deposit_amount || booking.deposit_amount <= 0) {
      this.log('No deposit to refund', { bookingId });
      return {
        refundId: null,
        refundAmount: 0,
        refundPercentage: 0,
        policyApplied: 'No deposit paid',
      };
    }

    // Calculate refund based on cancellation policy
    const { refundAmount, refundPercentage, policyApplied } = this.calculateRefund(
      booking.tour_date,
      booking.deposit_amount
    );

    if (refundAmount <= 0) {
      this.log('No refund per policy', { bookingId, policyApplied });

      // Record the refund decision even when $0
      await this.query(
        `INSERT INTO booking_timeline (booking_id, event_type, description, created_at)
         VALUES ($1, 'refund_policy', $2, NOW())`,
        [bookingId, policyApplied]
      ).catch(() => {});

      return {
        refundId: null,
        refundAmount: 0,
        refundPercentage,
        policyApplied,
      };
    }

    // Find the succeeded payment for this booking
    const payment = await this.queryOne<{
      id: number;
      stripe_payment_intent_id: string;
      amount: number;
    }>(
      `SELECT id, stripe_payment_intent_id, amount
       FROM payments
       WHERE booking_id = $1
         AND status = 'succeeded'
         AND stripe_payment_intent_id IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [bookingId]
    );

    if (!payment || !payment.stripe_payment_intent_id) {
      this.warn('No Stripe payment found for refund', { bookingId });
      return {
        refundId: null,
        refundAmount: refundAmount,
        refundPercentage,
        policyApplied: policyApplied + ' (no Stripe payment found - manual refund needed)',
      };
    }

    // Issue Stripe refund using brand-specific client
    try {
      const stripe = getBrandStripeClient(booking.brand_id ?? undefined);
      if (!stripe) {
        this.warn('Stripe not configured for brand', { bookingId, brandId: booking.brand_id });
        return {
          refundId: null,
          refundAmount,
          refundPercentage,
          policyApplied: policyApplied + ' (Stripe not configured - manual refund needed)',
        };
      }

      const refundAmountCents = Math.round(refundAmount * 100);

      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: refundAmountCents,
        reason: 'requested_by_customer',
        metadata: {
          booking_id: bookingId.toString(),
          policy_applied: policyApplied,
          refund_percentage: refundPercentage.toString(),
        },
      });

      // Update payment record
      await this.query(
        `UPDATE payments
         SET refund_amount = $2,
             refund_id = $3,
             refund_status = 'processing',
             updated_at = NOW()
         WHERE id = $1`,
        [payment.id, refundAmount, refund.id]
      );

      // Update booking with refund info
      await this.query(
        `UPDATE bookings
         SET refund_amount = $2,
             refund_status = 'processing',
             refund_policy_applied = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [bookingId, refundAmount, policyApplied]
      );

      // Add timeline entry
      await this.query(
        `INSERT INTO booking_timeline (booking_id, event_type, description, created_at)
         VALUES ($1, 'refund_initiated', $2, NOW())`,
        [bookingId, `Refund of $${refundAmount.toFixed(2)} (${refundPercentage}%) initiated. ${policyApplied}`]
      ).catch(() => {});

      this.log('Refund processed', {
        bookingId,
        refundId: refund.id,
        refundAmount,
        refundPercentage,
      });

      return {
        refundId: refund.id,
        refundAmount,
        refundPercentage,
        policyApplied,
        stripeRefundId: refund.id,
      };
    } catch (error) {
      logger.error('Stripe refund failed', {
        bookingId,
        paymentIntentId: payment.stripe_payment_intent_id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Record the failure
      await this.query(
        `INSERT INTO booking_timeline (booking_id, event_type, description, created_at)
         VALUES ($1, 'refund_failed', $2, NOW())`,
        [bookingId, `Refund of $${refundAmount.toFixed(2)} failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      ).catch(() => {});

      return {
        refundId: null,
        refundAmount,
        refundPercentage,
        policyApplied: policyApplied + ' (Stripe refund failed - manual refund needed)',
      };
    }
  }
}

export const refundService = new RefundService();
