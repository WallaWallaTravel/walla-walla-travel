'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TipAmountSelector } from '@/components/tip/TipAmountSelector';
import { TipPaymentForm } from '@/components/tip/TipPaymentForm';
import { TouchButton } from '@/components/mobile/TouchButton';

interface TipPageData {
  driver_name: string;
  tour_date: string;
  tour_total: number;
  brand_name: string;
  brand_logo_url?: string;
  tip_code: string;
  suggested_tips: {
    fifteen_percent: number;
    twenty_percent: number;
    twenty_five_percent: number;
  };
}

type PageState = 'loading' | 'select' | 'payment' | 'success' | 'error';

/**
 * Public Tip Payment Page
 *
 * Guests scan QR code and land here to tip their driver
 * No authentication required - validates tip code server-side
 */
export default function TipPage() {
  const params = useParams();
  const tipCode = (params.code as string).toUpperCase();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [pageData, setPageData] = useState<TipPageData | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadTipData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipCode]);

  const loadTipData = async () => {
    try {
      const response = await fetch(`/api/tips/${tipCode}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid tip code');
        setPageState('error');
        return;
      }

      setPageData(data.data);
      setPageState('select');
    } catch (_err) {
      setError('Failed to load tip page');
      setPageState('error');
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
  };

  const handleContinueToPayment = () => {
    if (selectedAmount && selectedAmount > 0) {
      setPageState('payment');
    }
  };

  const handlePaymentSuccess = () => {
    setPageState('success');
  };

  const handleBack = () => {
    setPageState('select');
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-red-600"
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Link Not Found
        </h1>
        <p className="text-gray-600 text-center max-w-sm">
          {error || 'This tip link is invalid or has expired. Please ask your driver for a new link.'}
        </p>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-[scale_0.3s_ease-out]">
          <svg
            className="w-12 h-12 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Thank You!
        </h1>
        <p className="text-xl text-gray-600 text-center mb-4">
          Your tip of ${selectedAmount?.toFixed(2)} has been sent.
        </p>
        <p className="text-gray-500 text-center max-w-sm">
          {pageData?.driver_name} appreciates your generosity!
        </p>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            Powered by {pageData?.brand_name}
          </p>
        </div>
      </div>
    );
  }

  if (!pageData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="p-6 text-center">
        {pageData.brand_logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={pageData.brand_logo_url}
            alt={pageData.brand_name}
            className="h-12 mx-auto mb-4"
          />
        ) : (
          <h2 className="text-lg font-semibold text-gray-500 mb-4">
            {pageData.brand_name}
          </h2>
        )}

        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🎉</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Tip Your Driver
        </h1>

        <p className="text-gray-600 mt-2">
          Thank you for touring with <strong>{pageData.driver_name}</strong>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {formatDate(pageData.tour_date)}
        </p>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-6 pb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {pageState === 'select' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-1">Tour Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${pageData.tour_total.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-4 text-center">
                  Select a tip amount
                </p>
                <TipAmountSelector
                  suggestedTips={pageData.suggested_tips}
                  onSelect={handleAmountSelect}
                  selectedAmount={selectedAmount}
                />
              </div>

              <TouchButton
                variant="primary"
                size="large"
                fullWidth
                onClick={handleContinueToPayment}
                disabled={!selectedAmount || selectedAmount <= 0}
              >
                Continue to Payment
              </TouchButton>
            </div>
          )}

          {pageState === 'payment' && selectedAmount && (
            <TipPaymentForm
              tipCode={tipCode}
              amount={selectedAmount}
              driverName={pageData.driver_name}
              onSuccess={handlePaymentSuccess}
              onBack={handleBack}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          100% of your tip goes directly to your driver
        </p>
      </div>
    </div>
  );
}
