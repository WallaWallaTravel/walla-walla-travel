'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * Booking Payment Success Page
 *
 * Shown after successful Stripe payment redirect from booking flow
 */

interface TicketInfo {
  ticketNumber: string;
  customerEmail?: string;
  tourDate?: string;
  tourTitle?: string;
}

export default function BookingSuccessPage({ params }: { params: Promise<{ tour_id: string }> }) {
  const { tour_id } = use(params);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentIntent = searchParams.get('payment_intent');
      const redirectStatus = searchParams.get('redirect_status');

      if (redirectStatus !== 'succeeded') {
        setError('Payment was not completed successfully. Please try again.');
        setLoading(false);
        return;
      }

      // Get tour info for display
      try {
        const response = await fetch(`/api/shared-tours/${tour_id}`);
        const data = await response.json();

        if (data.success) {
          setTicketInfo({
            ticketNumber: paymentIntent?.slice(-8).toUpperCase() || 'Unknown',
            tourTitle: data.data.title,
            tourDate: data.data.tour_date,
          });
        }
      } catch {
        // Non-critical
      }

      setLoading(false);
    };

    verifyPayment();
  }, [tour_id, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Confirming your booking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Issue</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href={`/shared-tours/${tour_id}/book`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">You're Booked!</h1>
        <p className="text-slate-600 mb-6">
          Your payment was successful and your wine tour is confirmed.
        </p>

        {ticketInfo && (
          <>
            {ticketInfo.tourTitle && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <p className="font-semibold text-slate-900">{ticketInfo.tourTitle}</p>
                {ticketInfo.tourDate && (
                  <p className="text-sm text-slate-600">{formatDate(ticketInfo.tourDate)}</p>
                )}
              </div>
            )}
          </>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-green-800 mb-2">Check your email!</h3>
          <p className="text-sm text-green-700">
            We've sent a confirmation email with your ticket number, meeting location, and everything you need to know for your tour.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-amber-800 mb-2">Don't forget:</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>✓ Bring valid ID (21+ for tastings)</li>
            <li>✓ Arrive 10 minutes early</li>
            <li>✓ Wear comfortable shoes</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link
            href="/shared-tours"
            className="block w-full py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
          >
            View More Tours
          </Link>
          <p className="text-sm text-slate-500">
            Questions? Email us at{' '}
            <a href="mailto:info@wallawalla.travel" className="text-[#E07A5F] hover:underline">
              info@wallawalla.travel
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
