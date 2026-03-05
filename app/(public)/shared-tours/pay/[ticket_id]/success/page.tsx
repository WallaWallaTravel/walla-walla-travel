'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * Payment Success Page
 *
 * Shown after successful Stripe payment redirect
 */

export default function PaymentSuccessPage({ params }: { params: Promise<{ ticket_id: string }> }) {
  const { ticket_id } = use(params);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const _paymentIntent = searchParams.get('payment_intent');
      const redirectStatus = searchParams.get('redirect_status');

      if (redirectStatus !== 'succeeded') {
        setError('Payment was not completed successfully. Please try again.');
        setLoading(false);
        return;
      }

      try {
        // Get ticket info to display
        const response = await fetch(`/api/shared-tours/tickets/${ticket_id}/payment-intent`);
        const data = await response.json();

        if (data.success) {
          setTicketNumber(data.data.ticketNumber);
        }
      } catch {
        // Non-critical - we still show success
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [ticket_id, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Confirming payment...</p>
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
            href={`/shared-tours/pay/${ticket_id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E07A5F] text-white rounded-lg font-semibold hover:bg-[#d06a4f] transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
        <p className="text-slate-600 mb-6">
          Your wine tour is confirmed. We&apos;ve sent a confirmation email with all the details.
        </p>

        {ticketNumber && (
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-500 mb-1">Ticket Number</p>
            <p className="text-2xl font-bold text-[#E07A5F] font-mono">{ticketNumber}</p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-green-800 mb-2">What&apos;s next?</h3>
          <ul className="text-sm text-green-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Check your email for confirmation with full tour details
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Arrive at the meeting point 10 minutes early
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Bring valid ID (21+ for tastings)
            </li>
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
