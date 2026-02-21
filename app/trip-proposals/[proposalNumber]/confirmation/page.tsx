'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
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
  deposit_percentage: number;
  start_date: string;
  end_date: string | null;
  party_size: number;
  trip_type: string | null;
}

export default function ConfirmationPage({
  params,
}: {
  params: Promise<{ proposalNumber: string }>;
}) {
  const { proposalNumber } = use(params);
  const [proposal, setProposal] = useState<TripProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalNumber]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`/api/trip-proposals/${proposalNumber}`);

      if (!response.ok) {
        throw new Error('Proposal not found');
      }

      const data = await response.json();
      if (data.success) {
        setProposal(data.data);
      } else {
        throw new Error(data.error || 'Failed to load proposal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
      logger.error('Failed to load trip proposal', { error: err });
    } finally {
      setLoading(false);
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

  const getTripTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      wine_tour: 'Wine Tour',
      celebration: 'Celebration',
      bachelor: 'Bachelor Party',
      corporate: 'Corporate Event',
      birthday: 'Birthday Celebration',
      anniversary: 'Anniversary',
      family: 'Family Outing',
      romantic: 'Romantic Getaway',
      other: 'Custom Experience',
    };
    return type ? labels[type] || type : 'Wine Country Experience';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8B1538] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-[#8B1538] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B1028] transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const brandConfig = getBrandEmailConfig(proposal.brand_id ?? undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{brandConfig.name}</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Confirmation</p>
              <p className="text-lg font-bold text-[#8B1538]">{proposal.proposal_number}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-12 text-white text-center">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-3xl font-bold mb-2">Proposal Accepted!</h2>
            <p className="text-white/90 text-lg">
              Thank you, {proposal.customer_name}. Your trip is confirmed.
            </p>
          </div>

          <div className="p-8">
            {/* Confirmation Details */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Booking Confirmed</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Confirmation Number</span>
                  <span className="font-bold text-[#8B1538] text-lg">{proposal.proposal_number}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Trip Type</span>
                  <span className="font-bold text-gray-900">{getTripTypeLabel(proposal.trip_type)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Date</span>
                  <span className="font-bold text-gray-900 text-right">
                    {formatDate(proposal.start_date)}
                    {proposal.end_date && proposal.end_date !== proposal.start_date && (
                      <>
                        <br />
                        <span className="text-sm font-normal text-gray-500">through</span>
                        <br />
                        {formatDate(proposal.end_date)}
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Party Size</span>
                  <span className="font-bold text-gray-900">{proposal.party_size} guests</span>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-amber-50 rounded-xl p-6 mb-8 border border-amber-200">
              <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                <span>💳</span> Payment Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Trip Total</span>
                  <span className="font-bold text-gray-900">{formatCurrency(proposal.total)}</span>
                </div>
                <div className="border-t border-amber-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">
                    Deposit Due ({proposal.deposit_percentage}%)
                  </span>
                  <span className="text-2xl font-bold text-[#8B1538]">
                    {formatCurrency(proposal.deposit_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pay Deposit CTA */}
            <div className="mb-8">
              <Link
                href={`/trip-proposals/${proposalNumber}/pay`}
                className="block w-full text-center bg-[#8B1538] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#6B1028] transition-colors shadow-lg"
              >
                Pay Deposit Now ({formatCurrency(proposal.deposit_amount)})
              </Link>
              <p className="text-center text-gray-600 text-sm mt-3">
                50% deposit to confirm your booking. Balance due 48 hours after your tour concludes.
              </p>
            </div>

            {/* Next Steps */}
            <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">What&apos;s Next?</h3>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-[#8B1538] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Pay Your Deposit</p>
                    <p className="text-gray-600 text-sm">
                      Use the button above to securely pay your deposit and confirm your trip.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-[#8B1538] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Receive Confirmation Email</p>
                    <p className="text-gray-600 text-sm">
                      A detailed confirmation email will be sent to{' '}
                      {proposal.customer_email || 'your email'} with your complete itinerary.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 bg-[#8B1538] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Final Details</p>
                    <p className="text-gray-600 text-sm">
                      We&apos;ll reach out 48 hours before your trip to confirm pickup details and answer any questions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* View Proposal Button */}
            <div className="space-y-3">
              <Link
                href={`/trip-proposals/${proposalNumber}`}
                className="block w-full text-center bg-white text-[#8B1538] border-2 border-[#8B1538] px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 transition-colors"
              >
                View Your Trip Details
              </Link>
            </div>

            {/* Contact Info */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 mb-2">Questions about your trip?</p>
              <a
                href={`tel:${brandConfig.phone.replace(/[^+\d]/g, '')}`}
                className="text-[#8B1538] font-bold text-lg hover:underline"
              >
                {brandConfig.phone}
              </a>
              <p className="text-gray-500 text-sm mt-1">
                or email{' '}
                <a
                  href={`mailto:${brandConfig.from_email}`}
                  className="text-[#8B1538] hover:underline"
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
            Thank you for choosing {brandConfig.name}. We look forward to hosting your wine country
            experience!
          </p>
        </div>
      </main>
    </div>
  );
}
