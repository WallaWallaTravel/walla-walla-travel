'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { logger } from '@/lib/logger';

const stripePromiseCache: Record<string, Promise<Stripe | null>> = {};

interface GroupMember {
  id: number;
  name: string;
  amount_owed: number;
  amount_paid: number;
  payment_status: string;
}

function GroupPaymentForm({ token, groupToken, amount, selectedIds }: {
  token: string; groupToken: string; amount: number; selectedIds: number[];
}) {
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
        confirmParams: { return_url: `${window.location.origin}/my-trip/${token}` },
        redirect: 'if_required',
      });

      if (confirmError) { setError(confirmError.message || 'Payment failed'); setProcessing(false); return; }

      if (paymentIntent?.status === 'succeeded') {
        window.location.href = `/my-trip/${token}`;
      }
    } catch (err) {
      logger.error('Group payment error', { error: err });
      setError('An unexpected error occurred.');
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

export default function GroupPaymentPage() {
  const params = useParams();
  const token = params.token as string;
  const groupToken = params.groupToken as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [paymentStep, setPaymentStep] = useState<'select' | 'pay'>('select');

  useEffect(() => {
    loadGroupInfo();
  }, [token, groupToken]);

  const loadGroupInfo = async () => {
    try {
      // Fetch group members via the proposal access token
      const res = await fetch(`/api/my-trip/${token}/guest/${groupToken}/payment-status`);
      const result = await res.json();
      if (!result.success) { setError('Could not load group info'); setLoading(false); return; }
      // For group view, we show the group data
      setLoading(false);
    } catch (err) {
      logger.error('Failed to load group info', { error: err });
      setError('Failed to load group information');
      setLoading(false);
    }
  };

  const createGroupPayment = async () => {
    if (selectedIds.length === 0) return;

    try {
      const res = await fetch(`/api/my-trip/${token}/group/${groupToken}/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_ids: selectedIds }),
      });
      const result = await res.json();
      if (!result.success) { setError(result.error?.message || 'Could not create payment'); return; }

      setClientSecret(result.data.client_secret);
      setPublishableKey(result.data.publishable_key);
      setAmount(result.data.amount);
      setPaymentStep('pay');
    } catch (err) {
      logger.error('Failed to create group payment', { error: err });
      setError('Failed to create payment');
    }
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
          <p className="text-gray-600">Loading group payment...</p>
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Group Payment</h1>
          {groupName && <p className="text-gray-600 mb-6">{groupName}</p>}

          {paymentStep === 'select' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select members to pay for:</p>
              {members.filter(m => m.payment_status !== 'paid').map(member => (
                <label key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds([...selectedIds, member.id]);
                      else setSelectedIds(selectedIds.filter(id => id !== member.id));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-600">
                      Owes: ${(member.amount_owed - member.amount_paid).toFixed(2)}
                    </div>
                  </div>
                </label>
              ))}
              <button
                onClick={createGroupPayment}
                disabled={selectedIds.length === 0}
                className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {paymentStep === 'pay' && clientSecret && stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <GroupPaymentForm token={token} groupToken={groupToken} amount={amount} selectedIds={selectedIds} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
