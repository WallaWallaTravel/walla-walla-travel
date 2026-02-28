'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

/**
 * Shared Tour Payment Page
 *
 * Standalone payment page for completing ticket payment
 * Used by guests who received a payment link (e.g., from hotel booking)
 */

interface TicketInfo {
  ticketId: string;
  ticketNumber: string;
  paymentStatus: string;
  totalAmount: number;
  hasPaymentIntent: boolean;
  customerName?: string;
  customerEmail?: string;
  ticketCount?: number;
  includesLunch?: boolean;
  tourTitle?: string;
  tourDate?: string;
  tourTime?: string;
}

interface PaymentIntentData {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

function PaymentForm({
  ticketInfo,
  onSuccess: _onSuccess,
}: {
  ticketInfo: TicketInfo;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/shared-tours/pay/${ticketInfo.ticketId}/success`,
      },
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
    // If successful, Stripe will redirect to the return_url
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full mt-6 py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${ticketInfo.totalAmount.toFixed(2)}`
        )}
      </button>
    </form>
  );
}

export default function PayTicketPage({ params }: { params: Promise<{ ticket_id: string }> }) {
  const { ticket_id } = use(params);

  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  // Dynamically load Stripe with the correct publishable key for the brand
  const stripePromise = useMemo(() => {
    const key = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    return key ? loadStripe(key) : null;
  }, [publishableKey]);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        // First, get ticket info
        const infoResponse = await fetch(`/api/shared-tours/tickets/${ticket_id}/payment-intent`);
        const infoData = await infoResponse.json();

        if (!infoData.success) {
          if (infoData.error?.includes('already paid')) {
            setPaymentSuccess(true);
            setLoading(false);
            return;
          }
          throw new Error(infoData.error || 'Failed to load ticket');
        }

        setTicketInfo({
          ticketId: ticket_id,
          ticketNumber: infoData.data.ticketNumber,
          paymentStatus: 'pending',
          totalAmount: infoData.data.amount,
          hasPaymentIntent: true,
        });

        // Create or get payment intent
        const paymentResponse = await fetch(`/api/shared-tours/tickets/${ticket_id}/payment-intent`, {
          method: 'POST',
        });
        const paymentData = await paymentResponse.json();

        if (!paymentData.success) {
          throw new Error(paymentData.error || 'Failed to initialize payment');
        }

        setPaymentIntent(paymentData.data);
        if (paymentData.data.publishableKey) {
          setPublishableKey(paymentData.data.publishableKey);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment information');
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [ticket_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Already Paid!</h1>
          <p className="text-slate-600 mb-6">
            This ticket has already been paid for. Check your email for confirmation details.
          </p>
          <Link
            href="/shared-tours"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
          >
            View More Tours
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Error</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href="/shared-tours"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
          >
            Back to Tours
          </Link>
        </div>
      </div>
    );
  }

  if (!ticketInfo || !paymentIntent || !stripePromise) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-lg mx-auto px-4">
          <Link href="/shared-tours" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Tours</span>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Ticket Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="text-center mb-6">
            <p className="text-sm text-slate-500 mb-1">Ticket</p>
            <p className="text-2xl font-bold text-[#E07A5F] font-mono">{ticketInfo.ticketNumber}</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Amount Due</span>
              <span className="text-2xl font-bold text-slate-900">
                ${ticketInfo.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Complete Payment</h2>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: paymentIntent.clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#E07A5F',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <PaymentForm
              ticketInfo={ticketInfo}
              onSuccess={() => setPaymentSuccess(true)}
            />
          </Elements>

          <p className="text-xs text-slate-500 text-center mt-4">
            Secure payment powered by Stripe
          </p>
        </div>
      </main>
    </div>
  );
}
