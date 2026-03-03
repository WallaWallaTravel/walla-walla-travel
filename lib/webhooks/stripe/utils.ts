/**
 * Shared helpers for Stripe webhook handlers.
 */

import Stripe from 'stripe';
import { queryOne } from '@/lib/db-helpers';

export interface PaymentRecord {
  id: number;
  booking_id: number | null;
  booking_number: string | null;
  customer_email: string | null;
  status: string;
  amount: number;
}

/**
 * Look up a payment record from a dispute's charge ID.
 */
export async function findPaymentForDispute(
  dispute: Stripe.Dispute
): Promise<PaymentRecord | null> {
  const chargeId =
    typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
  if (!chargeId) return null;

  return queryOne<PaymentRecord>(
    `SELECT p.id, p.booking_id, p.status, p.amount,
            b.booking_number, b.customer_email
     FROM payments p
     LEFT JOIN bookings b ON p.booking_id = b.id
     WHERE p.stripe_charge_id = $1 OR p.stripe_payment_intent_id = $1`,
    [chargeId]
  );
}
