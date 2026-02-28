'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { logger } from '@/lib/logger';

const stripePromiseCache: Record<string, Promise<Stripe | null>> = {};

function GuestPaymentForm({ token, guestToken, amount }: { token: string; guestToken: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) { setError(submitError.message || 'Validation failed'); setProcessing(false); return; }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/my-trip/${token}/guest/${guestToken}/pay/success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) { setError(confirmError.message || 'Payment failed'); setProcessing(false); return; }

      if (paymentIntent?.status === 'succeeded') {
        await fetch(`/api/my-trip/${token}/guest/${guestToken}/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_intent_id: paymentIntent.id }),
        });
        window.location.href = `/my-trip/${token}/guest/${guestToken}/pay/success`;
      }
    } catch (err) {
      logger.error('Payment error', { error: err });
      setError('An unexpected error occurred. Please try again.');
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
      >
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function GuestPayPage() {
  const params = useParams();
  const token = params.token as string;
  const guestToken = params.guestToken as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [status, setStatus] = useState<{ amount_owed: number; amount_paid: number; payment_status: string; proposal_number: string } | null>(null);

  useEffect(() => {
    loadPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, guestToken]);

  const loadPaymentStatus = async () => {
    try {
      const res = await fetch(`/api/my-trip/${token}/guest/${guestToken}/payment-status`);
      const result = await res.json();
      if (!result.success) { setError(result.error?.message || 'Could not load payment info'); setLoading(false); return; }

      const data = result.data;
      setStatus(data);
      setGuestName(data.guest_name);

      if (data.payment_status === 'paid') { setLoading(false); return; }
      if (data.is_sponsored) { setLoading(false); return; }
      if (data.amount_remaining <= 0) { setLoading(false); return; }

      // Create payment intent
      const payRes = await fetch(`/api/my-trip/${token}/guest/${guestToken}/create-payment`, { method: 'POST' });
      const payResult = await payRes.json();
      if (!payResult.success) { setError(payResult.error?.message || 'Could not create payment'); setLoading(false); return; }

      setClientSecret(payResult.data.client_secret);
      setPublishableKey(payResult.data.publishable_key);
      setAmount(payResult.data.amount);
    } catch (err) {
      logger.error('Failed to load payment', { error: err });
      setError('Failed to load payment information');
    }
    setLoading(false);
  };

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    if (!stripePromiseCache[publishableKey]) {
      stripePromiseCache[publishableKey] = loadStripe(publishableKey);
    }
    return stripePromiseCache[publishableKey];
  }, [publishableKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (status?.payment_status === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 max-w-md text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Complete</h1>
          <p className="text-gray-700">Thank you, {guestName}! Your payment has been received.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Guest Payment</h1>
          <p className="text-gray-600 mb-6">
            Hi {guestName}, please complete your payment of <strong>${amount.toFixed(2)}</strong>
            {status?.proposal_number && <> for trip {status.proposal_number}</>}.
          </p>

          {status && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Your Share:</span>
                <span className="font-semibold text-gray-900">${status.amount_owed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Already Paid:</span>
                <span className="font-semibold text-gray-900">${status.amount_paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-gray-700 font-medium">Remaining:</span>
                <span className="font-bold text-indigo-600">${amount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <GuestPaymentForm token={token} guestToken={guestToken} amount={amount} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
