"use client";

export const dynamic = 'force-dynamic';

/**
 * Stripe Payment Page for Reservation Deposits
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { StripePaymentForm } from '@/components/payment/StripePaymentForm';
import Link from 'next/link';
import { useBookingTracking } from '@/lib/hooks/useBookingTracking';

// Load Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams?.get('id');

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<{
    reservation_number?: string;
    customer?: { email?: string; name?: string };
    party_size?: number;
    preferred_date?: string;
    event_type?: string;
    deposit_amount?: string;
  } | null>(null);

  // Booking tracking
  const { trackBookingProgress, trackPageView: _trackPageView } = useBookingTracking();

  // Fetch reservation and create payment intent
  useEffect(() => {
    if (!reservationId) {
      setError('No reservation ID provided');
      setLoading(false);
      return;
    }

    async function initialize() {
      try {
        // Fetch reservation details
        const resResponse = await fetch(`/api/booking/reserve/${reservationId}`);
        if (!resResponse.ok) {
          throw new Error('Reservation not found');
        }
        const resData = await resResponse.json();
        setReservation(resData);

        // Create payment intent
        const paymentResponse = await fetch('/api/booking/reserve/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(resData.deposit_amount),
            reservationId: resData.id,
            customerEmail: resData.customer.email,
            customerName: resData.customer.name,
            partySize: resData.party_size,
            preferredDate: resData.preferred_date,
          }),
        });

        if (!paymentResponse.ok) {
          throw new Error('Failed to initialize payment');
        }

        const { clientSecret } = await paymentResponse.json();
        setClientSecret(clientSecret);
        setLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load payment');
        setLoading(false);
      }
    }

    initialize();
  }, [reservationId]);

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Confirm payment with backend
      const response = await fetch('/api/booking/reserve/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          reservationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }

      // Track successful payment and conversion
      trackBookingProgress({
        stepReached: 'completed',
        email: reservation?.customer?.email,
        name: reservation?.customer?.name,
        partySize: reservation?.party_size,
        tourDate: reservation?.preferred_date,
      });

      // Redirect to confirmation page
      router.push(`/book/reserve/confirmation?id=${reservationId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment confirmation failed');
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/book"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Return to Booking
          </Link>
        </div>
      </div>
    );
  }

  if (!clientSecret || !reservation) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Deposit</h1>
          <p className="text-gray-600">
            Reservation #{reservation.reservation_number}
          </p>
        </div>

        {/* Reservation Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Reservation Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Party Size:</span>
              <span className="font-semibold">{reservation.party_size} guests</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Preferred Date:</span>
              <span className="font-semibold">
                {reservation.preferred_date && new Date(reservation.preferred_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Event Type:</span>
              <span className="font-semibold capitalize">{reservation.event_type?.replace('_', ' ')}</span>
            </div>
            <div className="border-t border-gray-200 my-3"></div>
            <div className="flex justify-between text-lg">
              <span className="font-bold text-gray-900">Deposit:</span>
              <span className="font-bold text-gray-900">${parseFloat(reservation.deposit_amount ?? '0').toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="font-bold text-gray-900 mb-6">Payment Information</h2>
          <Elements stripe={stripePromise} options={options}>
            <StripePaymentForm
              amount={parseFloat(reservation.deposit_amount ?? '0')}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need help? Contact us at{' '}
            <a href="mailto:info@wallawalla.travel" className="text-blue-600 hover:text-blue-800">
              info@wallawalla.travel
            </a>
            {' '}or{' '}
            <a href="tel:509-200-8000" className="text-blue-600 hover:text-blue-800">
              509-200-8000
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>}>
      <PaymentPageContent />
    </Suspense>
  );
}


