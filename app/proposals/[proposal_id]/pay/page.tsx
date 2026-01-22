'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { logger } from '@/lib/logger';
import Footer from '@/components/Footer';

// Load Stripe outside of component to avoid recreation
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface Proposal {
  id: number;
  proposal_number: string;
  title: string;
  client_name: string;
  accepted_by_name: string;
  accepted_by_email: string;
  total: number;
  final_total: number;
  status: string;
}

function PaymentForm({ proposalId, amount }: { proposalId: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'An error occurred');
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/proposals/${proposalId}/payment-success`,
      },
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setProcessing(false);
    }
    // If successful, Stripe redirects to return_url
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium text-gray-700">Deposit Amount</span>
          <span className="text-2xl font-bold text-[#8B1538]">{formatCurrency(amount)}</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          50% deposit to confirm your booking. The remaining balance is due 48 hours before your tour.
        </p>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#8B1538] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#6B1028] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>Pay {formatCurrency(amount)}</>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Secure payment powered by Stripe
      </div>
    </form>
  );
}

export default function ProposalPaymentPage({ params }: { params: Promise<{ proposal_id: string }> }) {
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setProposalId(p.proposal_id));
  }, [params]);

  useEffect(() => {
    if (proposalId) {
      initializePayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const initializePayment = async () => {
    try {
      // Fetch proposal details
      const proposalResponse = await fetch(`/api/proposals/${proposalId}`);
      if (!proposalResponse.ok) {
        throw new Error('Proposal not found');
      }
      const proposalData = await proposalResponse.json();
      setProposal(proposalData.data);

      // Check if proposal is accepted
      if (proposalData.data.status !== 'accepted') {
        throw new Error('This proposal must be accepted before payment');
      }

      // Create payment intent
      const paymentResponse = await fetch(`/api/proposals/${proposalId}/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Failed to initialize payment');
      }

      const paymentData = await paymentResponse.json();
      setClientSecret(paymentData.data.client_secret);
      setAmount(paymentData.data.amount);
    } catch (err) {
      logger.error('Payment initialization error', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8B1538] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Preparing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href={proposalId ? `/proposals/${proposalId}` : '/'}
            className="inline-block bg-[#8B1538] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B1028] transition-colors"
          >
            Back to Proposal
          </Link>
        </div>
      </div>
    );
  }

  if (!proposal || !clientSecret) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
              <p className="text-sm text-gray-600">{proposal.proposal_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Deposit</p>
              <p className="text-xl font-bold text-[#8B1538]">{formatCurrency(amount)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Proposal Summary */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tour</span>
                <span className="font-medium text-gray-900">{proposal.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Guest</span>
                <span className="font-medium text-gray-900">
                  {proposal.accepted_by_name || proposal.client_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(proposal.final_total || proposal.total)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t text-lg font-bold">
                <span className="text-gray-900">Deposit (50%)</span>
                <span className="text-[#8B1538]">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          {/* Stripe Payment Form */}
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#8B1538',
                  colorBackground: '#ffffff',
                  colorText: '#1f2937',
                  colorDanger: '#dc2626',
                  fontFamily: 'system-ui, sans-serif',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <PaymentForm proposalId={proposalId || ''} amount={amount} />
          </Elements>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Your payment information is encrypted and secure.
            <br />
            We never store your full card details.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
