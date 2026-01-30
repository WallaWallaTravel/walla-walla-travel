'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import BrandFooter from '@/components/BrandFooter';
import { getBrandEmailConfig, type BrandEmailConfig } from '@/lib/email-brands';

interface Proposal {
  id: number;
  proposal_number: string;
  title: string;
  client_name: string;
  accepted_by_name: string;
  accepted_by_email: string;
  total: number | string;
  final_total?: number | string;
  brand_id?: number;
  converted_to_booking_id: number | null;
}

interface ConversionResult {
  booking_number?: string;
  booking_id?: number;
}

export default function PaymentSuccessPage({ params }: { params: Promise<{ proposal_id: string }> }) {
  const searchParams = useSearchParams();
  const paymentIntent = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const redirectStatus = searchParams.get('redirect_status');

  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'succeeded' | 'processing' | 'failed'>('processing');
  const [brandConfig, setBrandConfig] = useState<BrandEmailConfig>(getBrandEmailConfig(1));

  useEffect(() => {
    params.then(p => setProposalId(p.proposal_id));
  }, [params]);

  useEffect(() => {
    if (proposalId && paymentIntent) {
      verifyPaymentAndConvert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId, paymentIntent]);

  const verifyPaymentAndConvert = async () => {
    try {
      // Check the redirect status from Stripe
      if (redirectStatus === 'succeeded') {
        setPaymentStatus('succeeded');

        // Fetch proposal details
        const proposalResponse = await fetch(`/api/proposals/${proposalId}`);
        if (!proposalResponse.ok) {
          throw new Error('Could not fetch proposal');
        }
        const proposalData = await proposalResponse.json();
        setProposal(proposalData.data);

        // Set brand-specific config
        if (proposalData.data?.brand_id) {
          setBrandConfig(getBrandEmailConfig(proposalData.data.brand_id));
        }

        // Confirm payment and convert to booking
        const confirmResponse = await fetch(`/api/proposals/${proposalId}/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_intent_id: paymentIntent,
          }),
        });

        if (confirmResponse.ok) {
          const confirmData = await confirmResponse.json();
          setConversionResult(confirmData.data);
        } else {
          // Payment succeeded but conversion failed - log but don't show error
          logger.warn('Proposal conversion failed after successful payment', { proposalId, paymentIntent });
        }
      } else if (redirectStatus === 'processing') {
        setPaymentStatus('processing');
      } else {
        setPaymentStatus('failed');
        setError('Payment was not successful. Please try again.');
      }
    } catch (err) {
      logger.error('Payment verification error', { error: err });
      setError(err instanceof Error ? err.message : 'An error occurred');
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

  // Helper to get proposal total (handles string/number and fallback to final_total)
  const getProposalTotal = (p: Proposal): number => {
    const value = p.total ?? p.final_total ?? 0;
    return typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8B1538] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed' || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
          <p className="text-gray-600 mb-6">{error || 'Your payment could not be processed. Please try again.'}</p>
          <Link
            href={`/proposals/${proposalId}/pay`}
            className="inline-block bg-[#8B1538] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B1028] transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Processing</h1>
          <p className="text-gray-600 mb-6">
            Your payment is being processed. You will receive a confirmation email once complete.
          </p>
          <Link
            href={`/proposals/${proposalId}`}
            className="inline-block bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            View Proposal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Successful! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your booking has been confirmed
          </p>

          {/* Confirmation Details */}
          {proposal && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Booking Confirmation</h2>
              <div className="space-y-3">
                {conversionResult?.booking_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking Number</span>
                    <span className="font-bold text-[#8B1538]">{conversionResult.booking_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Proposal</span>
                  <span className="font-semibold text-gray-900">{proposal.proposal_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tour</span>
                  <span className="font-semibold text-gray-900">{proposal.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guest</span>
                  <span className="font-semibold text-gray-900">
                    {proposal.accepted_by_name || proposal.client_name}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span className="font-bold text-gray-900">Deposit Paid</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(getProposalTotal(proposal) * 0.5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining Balance</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(getProposalTotal(proposal) * 0.5)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8 text-left border-l-4 border-blue-500">
            <h3 className="font-bold text-gray-900 mb-3">What Happens Next?</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="font-bold text-blue-600 mr-2">1.</span>
                <span>You&apos;ll receive a confirmation email with your receipt</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-blue-600 mr-2">2.</span>
                <span>Our team will reach out to confirm final details</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-blue-600 mr-2">3.</span>
                <span>The remaining balance is due 48 hours after your tour concludes</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-blue-600 mr-2">4.</span>
                <span>Get ready for an amazing wine country experience!</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => window.print()}
              className="w-full bg-[#8B1538] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#6B1028] transition-colors shadow-lg hover:shadow-xl"
            >
              Print Confirmation
            </button>

            <Link
              href="/"
              className="block w-full bg-gray-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Return Home
            </Link>
          </div>

          {/* Contact Info - Brand Specific */}
          <div className="mt-8 pt-8 border-t text-center">
            <p className="text-gray-600 mb-2">Questions? We&apos;re here to help!</p>
            <p className="text-gray-900 font-semibold">
              📞 {brandConfig.phone} | 📧 {brandConfig.reply_to}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {brandConfig.name} • {brandConfig.website}
            </p>
          </div>
        </div>
      </main>

      <BrandFooter brandId={proposal?.brand_id} />
    </div>
  );
}
