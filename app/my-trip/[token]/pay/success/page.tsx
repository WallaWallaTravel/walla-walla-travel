'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { logger } from '@/lib/logger';

interface TripProposal {
  proposal_number: string;
  status: string;
  brand_id: number | null;
  customer_name: string;
  customer_email: string | null;
  total: string;
  deposit_amount: string;
  deposit_paid: boolean;
  start_date: string;
  end_date: string | null;
  party_size: number;
  trip_type: string | null;
}

export default function MyTripPaymentSuccessPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const searchParams = useSearchParams();
  const [proposal, setProposal] = useState<TripProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [_confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (token) {
      confirmPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const confirmPayment = async () => {
    try {
      const paymentIntentId = searchParams.get('payment_intent');
      const redirectStatus = searchParams.get('redirect_status');

      if (redirectStatus !== 'succeeded') {
        throw new Error(
          'Payment was not completed. Please try again or contact support.'
        );
      }

      if (!paymentIntentId) {
        throw new Error('Missing payment information. Please contact support.');
      }

      // Fetch proposal to check current state
      const proposalResponse = await fetch(`/api/my-trip/${token}`);
      if (!proposalResponse.ok) {
        throw new Error('Trip not found');
      }
      const proposalData = await proposalResponse.json();
      if (!proposalData.success) {
        throw new Error(proposalData.error || 'Failed to load trip');
      }

      setProposal(proposalData.data);

      // If already paid (webhook got there first), just show success
      if (proposalData.data.deposit_paid) {
        setConfirmed(true);
        setLoading(false);
        return;
      }

      // Confirm payment with our API
      setConfirming(true);
      const confirmResponse = await fetch(
        `/api/my-trip/${token}/confirm-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_intent_id: paymentIntentId }),
        }
      );

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        // If already paid, that's fine
        if (errorData.data?.already_paid) {
          setConfirmed(true);
        } else {
          throw new Error(
            errorData.error || 'Failed to confirm payment. The webhook will process it shortly.'
          );
        }
      } else {
        setConfirmed(true);
        // Re-fetch proposal to get updated data
        const updatedResponse = await fetch(`/api/my-trip/${token}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          if (updatedData.success) {
            setProposal(updatedData.data);
          }
        }
      }
    } catch (err) {
      logger.error('Payment confirmation error', { error: err });
      setError(
        err instanceof Error ? err.message : 'Failed to confirm payment'
      );
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">
            {confirming ? 'Confirming your payment...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-amber-500 text-5xl mb-4">!</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Processing
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            If your card was charged, the payment will be processed
            automatically. You&apos;ll receive a confirmation email shortly.
          </p>
          <Link
            href={`/my-trip/${token}`}
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            View Your Trip
          </Link>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return null;
  }

  const brandConfig = getBrandEmailConfig(proposal.brand_id ?? undefined);
  const depositAmount = parseFloat(proposal.deposit_amount);
  const total = parseFloat(proposal.total);
  const balanceRemaining = total - depositAmount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {brandConfig.name}
              </h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Payment Receipt</p>
              <p className="text-lg font-bold text-indigo-700">
                {proposal.proposal_number}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-12 text-white text-center">
            <div className="text-6xl mb-4">&#10003;</div>
            <h2 className="text-3xl font-bold mb-2">Deposit Received!</h2>
            <p className="text-white/90 text-lg">
              Thank you, {proposal.customer_name}. Your deposit has been
              processed.
            </p>
          </div>

          <div className="p-8">
            {/* Payment Receipt */}
            <div className="bg-green-50 rounded-xl p-6 mb-8 border border-green-200">
              <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                <span>&#10003;</span> Payment Receipt
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="text-xl font-bold text-green-700">
                    {formatCurrency(depositAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trip Total</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="border-t border-green-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">
                    Balance Remaining
                  </span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(balanceRemaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">
                Trip Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Confirmation Number</span>
                  <span className="font-bold text-indigo-700">
                    {proposal.proposal_number}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium text-gray-900 text-right">
                    {formatDate(proposal.start_date)}
                    {proposal.end_date &&
                      proposal.end_date !== proposal.start_date && (
                        <>
                          <br />
                          <span className="text-sm font-normal text-gray-500">
                            through
                          </span>
                          <br />
                          {formatDate(proposal.end_date)}
                        </>
                      )}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Party Size</span>
                  <span className="font-medium text-gray-900">
                    {proposal.party_size} guests
                  </span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">
                What&apos;s Next?
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    &#10003;
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Deposit Paid
                    </p>
                    <p className="text-gray-600 text-sm">
                      Your deposit of {formatCurrency(depositAmount)} has been
                      received. A receipt will be sent to{' '}
                      {proposal.customer_email || 'your email'}.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Pre-Trip Coordination
                    </p>
                    <p className="text-gray-600 text-sm">
                      We&apos;ll reach out 48 hours before your trip to confirm
                      pickup details and answer any questions.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Final Payment
                    </p>
                    <p className="text-gray-600 text-sm">
                      Balance of {formatCurrency(balanceRemaining)} is due 48
                      hours after your tour concludes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* View Trip Button */}
            <div className="space-y-3">
              <Link
                href={`/my-trip/${token}`}
                className="block w-full text-center bg-indigo-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg"
              >
                View Your Trip
              </Link>
            </div>

            {/* Contact Info */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 mb-2">Questions about your trip?</p>
              <a
                href={`tel:${brandConfig.phone.replace(/[^+\d]/g, '')}`}
                className="text-indigo-700 font-bold text-lg hover:underline"
              >
                {brandConfig.phone}
              </a>
              <p className="text-gray-500 text-sm mt-1">
                or email{' '}
                <a
                  href={`mailto:${brandConfig.from_email}`}
                  className="text-indigo-700 hover:underline"
                >
                  {brandConfig.from_email}
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>
            Thank you for choosing {brandConfig.name}. We look forward to
            hosting your wine country experience!
          </p>
        </div>
      </main>
    </div>
  );
}
