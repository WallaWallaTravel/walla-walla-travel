'use client';

import { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

interface Booking {
  id: number;
  booking_number: string;
  final_payment_amount: string;
}

interface Props {
  booking: Booking;
  onSuccess: () => void;
  onCancel: () => void;
}

function FinalPaymentFormInner({ booking, onSuccess, onCancel }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment in backend
        await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
          }),
        });

        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment processing failed');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm font-semibold">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-900 rounded-lg font-bold transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors"
        >
          {processing ? 'Processing...' : `Pay $${parseFloat(booking.final_payment_amount).toFixed(2)}`}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Secure payment powered by Stripe
      </p>
    </form>
  );
}

export default function FinalPaymentForm({ booking, onSuccess, onCancel }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Dynamically load Stripe with the correct publishable key for the brand
  const stripePromise = useMemo(() => {
    const key = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    return key ? loadStripe(key) : null;
  }, [publishableKey]);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_number: booking.booking_number,
            amount: parseFloat(booking.final_payment_amount),
            payment_type: 'final_payment',
          }),
        });

        const result = await response.json();

        if (result.success) {
          setClientSecret(result.data.client_secret);
          if (result.data.publishable_key) {
            setPublishableKey(result.data.publishable_key);
          }
        } else {
          setError('Failed to initialize payment');
        }
      } catch (_err) {
        setError('Failed to initialize payment');
      }
    };
    createPaymentIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
        <p className="text-red-800 text-sm font-semibold">{error}</p>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
        <p className="mt-2 text-gray-600 text-sm">Initializing payment...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <FinalPaymentFormInner booking={booking} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

