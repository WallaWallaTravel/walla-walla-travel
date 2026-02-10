'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { TouchButton } from '@/components/mobile/TouchButton';

interface TipPaymentFormInnerProps {
  amount: number;
  tipCode: string;
  driverName: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

/**
 * Inner payment form component that uses Stripe Elements
 */
function TipPaymentFormInner({
  amount,
  tipCode,
  driverName,
  onSuccess,
  onError,
}: TipPaymentFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [guestName, setGuestName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    try {
      // Submit the payment element first
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      // Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tip/${tipCode}/success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        onError(confirmError.message || 'Payment confirmation failed');
        setLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tip summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <p className="text-sm text-green-700">You&apos;re tipping</p>
        <p className="text-3xl font-bold text-green-800">${amount.toFixed(2)}</p>
        <p className="text-sm text-green-700 mt-1">for {driverName}</p>
      </div>

      {/* Guest name (optional) */}
      <div>
        <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-2">
          Your Name (optional)
        </label>
        <input
          id="guest-name"
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Leave blank to tip anonymously"
          maxLength={100}
          className="
            w-full px-4 py-3 min-h-[48px]
            text-base text-gray-900
            border border-gray-300 rounded-lg
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500
            focus:outline-none
            placeholder:text-gray-500
          "
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Payment element */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {/* Submit button */}
      <TouchButton
        type="submit"
        variant="primary"
        size="large"
        fullWidth
        loading={loading}
        disabled={!stripe || loading}
      >
        {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </TouchButton>

      {/* Security notice */}
      <p className="text-sm text-gray-500 text-center flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Secure payment powered by Stripe
      </p>
    </form>
  );
}

interface TipPaymentFormProps {
  tipCode: string;
  amount: number;
  driverName: string;
  guestName?: string;
  publishableKey?: string;
  onSuccess: () => void;
  onBack: () => void;
}

/**
 * TipPaymentForm - Stripe payment form for guest tips
 *
 * Features:
 * - Apple Pay / Google Pay support
 * - Card payment via Stripe Elements
 * - Optional guest name field
 * - Mobile-optimized layout
 */
export function TipPaymentForm({
  tipCode,
  amount,
  driverName,
  publishableKey: publishableKeyProp,
  onSuccess,
  onBack,
}: TipPaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | undefined>(publishableKeyProp);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamically load Stripe with the correct publishable key for the brand
  const stripePromise = useMemo(() => {
    const key = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    return key ? loadStripe(key) : null;
  }, [publishableKey]);

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch(`/api/tips/${tipCode}/create-payment-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to create payment intent');
        }
        setClientSecret(data.data.client_secret);
        if (data.data.publishable_key) {
          setPublishableKey(data.data.publishable_key);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment initialization failed');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [tipCode, amount]);

  const handleError = (message: string) => {
    setError(message);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        <p className="text-gray-600">Setting up payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Payment Error</h3>
          <p className="text-red-700">{error}</p>
        </div>

        <TouchButton variant="secondary" size="large" fullWidth onClick={onBack}>
          Go Back
        </TouchButton>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) return null;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Change amount
      </button>

      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#2563eb',
              borderRadius: '8px',
              fontSizeBase: '16px',
              fontWeightNormal: '500',
            },
          },
        }}
      >
        <TipPaymentFormInner
          amount={amount}
          tipCode={tipCode}
          driverName={driverName}
          onSuccess={onSuccess}
          onError={handleError}
        />
      </Elements>
    </div>
  );
}
