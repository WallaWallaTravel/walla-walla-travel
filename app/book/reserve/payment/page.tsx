/**
 * Stripe Payment Page — Server Component Wrapper
 * Fetches reservation data server-side, passes to client Stripe component.
 * Redirects to /book if reservation not found.
 */

import { redirect } from 'next/navigation';
import { Decimal } from '@prisma/client/runtime/library';
import { getReservationById } from '@/lib/actions/reservation-actions';
import { PaymentClient } from './PaymentClient';

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function PaymentPage({ searchParams }: PageProps) {
  const { id } = await searchParams;

  if (!id) {
    redirect('/book');
  }

  const reservationId = parseInt(id);
  if (isNaN(reservationId)) {
    redirect('/book');
  }

  const raw = await getReservationById(reservationId);
  if (!raw) {
    redirect('/book');
  }

  const reservation = {
    id: raw.id as number,
    reservation_number: raw.reservation_number as string,
    customer_name: raw.customer_name as string,
    customer_email: raw.customer_email as string,
    party_size: raw.party_size as number,
    preferred_date: raw.preferred_date instanceof Date
      ? raw.preferred_date.toISOString()
      : String(raw.preferred_date),
    event_type: (raw.event_type as string) || 'wine_tour',
    deposit_amount: raw.deposit_amount instanceof Decimal
      ? Number(raw.deposit_amount)
      : Number(raw.deposit_amount),
  };

  return <PaymentClient reservation={reservation} />;
}
