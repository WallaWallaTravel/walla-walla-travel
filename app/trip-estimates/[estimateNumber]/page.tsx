'use client';

import { useState, useEffect, use } from 'react';
import { logger } from '@/lib/logger';

interface EstimateData {
  estimate_number: string;
  status: string;
  customer_name: string;
  trip_type: string;
  trip_title: string | null;
  trip_description: string | null;
  start_date: string | null;
  end_date: string | null;
  party_size: number;
  deposit_amount: number;
  deposit_reason: string | null;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  valid_until: string | null;
}

const TRIP_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  wine_tour: { icon: '🍷', label: 'Wine Tour' },
  wine_group: { icon: '🍇', label: 'Wine Group' },
  bachelorette: { icon: '🥂', label: 'Bachelorette' },
  corporate: { icon: '🏢', label: 'Corporate Event' },
  wedding: { icon: '💒', label: 'Wedding' },
  anniversary: { icon: '💍', label: 'Anniversary' },
  family: { icon: '👨‍👩‍👧‍👦', label: 'Family Trip' },
  romantic: { icon: '💕', label: 'Romantic Getaway' },
  custom: { icon: '✨', label: 'Custom Experience' },
};

export default function TripEstimateClientPage({
  params,
}: {
  params: Promise<{ estimateNumber: string }>;
}) {
  const { estimateNumber } = use(params);
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    async function loadEstimate() {
      try {
        const response = await fetch(`/api/trip-estimates/${estimateNumber}`);
        const result = await response.json();

        if (result.success) {
          setEstimate(result.data);
          if (result.data.deposit_paid) {
            setPaymentSuccess(true);
          }
        } else {
          setError(result.error || 'Estimate not found');
        }
      } catch (err) {
        logger.error('Failed to load estimate', { error: err });
        setError('Unable to load estimate. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadEstimate();
  }, [estimateNumber]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDayCount = () => {
    if (!estimate?.start_date || !estimate?.end_date) return null;
    if (estimate.start_date === estimate.end_date) return 1;
    const start = new Date(estimate.start_date);
    const end = new Date(estimate.end_date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handlePayDeposit = async () => {
    if (!estimate) return;

    setPaymentLoading(true);
    try {
      const response = await fetch(`/api/trip-estimates/${estimateNumber}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: undefined,
          customer_name: estimate.customer_name,
        }),
      });
      const result = await response.json();

      if (result.success && result.data.client_secret) {
        // For now, show the payment intent was created successfully
        // In production, this would integrate with Stripe Elements or redirect to Stripe Checkout
        alert(
          `Payment intent created successfully!\n\nAmount: ${formatCurrency(result.data.amount)}\n\nTo complete the payment, the admin will share a Stripe payment link or process the payment directly.\n\nPayment Reference: ${result.data.payment_intent_id}`
        );
      } else {
        alert(result.error || 'Unable to process payment. Please contact us directly.');
      }
    } catch (err) {
      logger.error('Failed to initiate payment', { error: err });
      alert('Unable to process payment. Please contact us at (509) 200-8000.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-slate-300 border-t-[#1E3A5F] rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading your estimate...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !estimate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Estimate Not Found</h1>
          <p className="text-slate-600 mb-6">
            {error || 'This estimate may have expired or is no longer available.'}
          </p>
          <p className="text-sm text-slate-500">
            Questions? Contact us at{' '}
            <a href="tel:+15092008000" className="text-[#1E3A5F] font-medium hover:underline">
              (509) 200-8000
            </a>
          </p>
        </div>
      </div>
    );
  }

  const tripTypeConfig = TRIP_TYPE_CONFIG[estimate.trip_type] || TRIP_TYPE_CONFIG.custom!;
  const dayCount = getDayCount();
  const isExpired = estimate.valid_until && new Date(estimate.valid_until + 'T23:59:59') < new Date();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Bar */}
      <div className="bg-[#1E3A5F] text-white">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <p className="text-sm font-medium text-blue-200">Walla Walla Travel</p>
          <p className="text-xs text-blue-300/70">Trip Estimate</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Expired Banner */}
        {isExpired && !estimate.deposit_paid && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800 font-medium">
              This estimate expired on {formatDate(estimate.valid_until!)}. Please contact us for an updated quote.
            </p>
          </div>
        )}

        {/* Trip Summary Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2D5A8F] text-white p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{tripTypeConfig.icon}</span>
              <div>
                <h1 className="text-2xl font-bold">
                  {estimate.trip_title || tripTypeConfig.label}
                </h1>
                <p className="text-blue-200 text-sm">
                  {tripTypeConfig.label} for {estimate.customer_name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              {estimate.start_date && (
                <div>
                  <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">Dates</p>
                  <p className="font-semibold">
                    {new Date(estimate.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {estimate.end_date && estimate.end_date !== estimate.start_date && (
                      <> – {new Date(estimate.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                    )}
                  </p>
                </div>
              )}
              {dayCount && (
                <div>
                  <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">Duration</p>
                  <p className="font-semibold">{dayCount} {dayCount === 1 ? 'Day' : 'Days'}</p>
                </div>
              )}
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wider mb-1">Party Size</p>
                <p className="font-semibold">{estimate.party_size} {estimate.party_size === 1 ? 'Guest' : 'Guests'}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {estimate.trip_description && (
            <div className="px-8 py-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">What&apos;s Planned</h2>
              <p className="text-slate-700 leading-relaxed">{estimate.trip_description}</p>
            </div>
          )}

          {/* Summary Line */}
          <div className="px-8 py-6">
            <p className="text-slate-700 leading-relaxed">
              This{dayCount ? ` ${dayCount}-day` : ''} {tripTypeConfig.label.toLowerCase()} includes
              transportation, winery visits, dining, and full trip coordination for{' '}
              {estimate.party_size} {estimate.party_size === 1 ? 'guest' : 'guests'}.
            </p>
          </div>
        </div>

        {/* Deposit Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          {paymentSuccess || estimate.deposit_paid ? (
            // Paid State
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Deposit Received</h2>
              <p className="text-3xl font-bold text-green-700 mb-4">
                {formatCurrency(estimate.deposit_amount)}
              </p>
              <p className="text-slate-600 max-w-md mx-auto">
                Thank you, {estimate.customer_name}! Your deposit has been received and we&apos;re
                now building your personalized trip itinerary. We&apos;ll be in touch soon with the full details.
              </p>
              {estimate.deposit_paid_at && (
                <p className="text-sm text-slate-500 mt-4">
                  Paid on{' '}
                  {new Date(estimate.deposit_paid_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          ) : (
            // Payment Request
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Deposit Required</h2>
                {estimate.deposit_reason && (
                  <p className="text-slate-600 text-sm">{estimate.deposit_reason}</p>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-6 text-center mb-6">
                <p className="text-sm text-slate-600 mb-2">Amount Due</p>
                <p className="text-4xl font-bold text-[#1E3A5F]">
                  {formatCurrency(estimate.deposit_amount)}
                </p>
                {estimate.valid_until && (
                  <p className="text-sm text-slate-500 mt-2">
                    Valid until {formatDate(estimate.valid_until)}
                  </p>
                )}
              </div>

              {!isExpired && (
                <button
                  onClick={handlePayDeposit}
                  disabled={paymentLoading}
                  className="w-full py-4 bg-[#1E3A5F] hover:bg-[#2D5A8F] text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50 shadow-lg"
                >
                  {paymentLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Pay ${formatCurrency(estimate.deposit_amount)} Deposit`
                  )}
                </button>
              )}

              {isExpired && (
                <div className="text-center py-4">
                  <p className="text-amber-700 font-medium mb-2">This estimate has expired.</p>
                  <p className="text-slate-600 text-sm">
                    Please contact us for an updated quote.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contact Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <h3 className="font-semibold text-slate-900 mb-2">Questions?</h3>
          <p className="text-slate-600 mb-4">
            We&apos;re happy to discuss your trip details and answer any questions.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <a
              href="tel:+15092008000"
              className="flex items-center gap-2 text-[#1E3A5F] font-medium hover:underline"
            >
              <span>📞</span>
              (509) 200-8000
            </a>
            <a
              href="mailto:info@wallawalla.travel"
              className="flex items-center gap-2 text-[#1E3A5F] font-medium hover:underline"
            >
              <span>📧</span>
              info@wallawalla.travel
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Walla Walla Travel &middot; Premium Wine Country Experiences</p>
        </div>
      </div>
    </div>
  );
}
