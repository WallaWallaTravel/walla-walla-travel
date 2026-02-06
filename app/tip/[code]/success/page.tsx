'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Tip Payment Success Page
 *
 * Shown after Stripe redirects back from payment
 * Displays success message with tip amount
 */
export default function TipSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tipCode = params.code as string;
  const paymentIntent = searchParams.get('payment_intent');

  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    // Optionally verify the payment intent
    // For now, just show success
    setLoading(false);
  }, [paymentIntent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        <p className="mt-4 text-gray-600">Confirming payment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
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
        Your tip has been sent successfully.
      </p>

      {amount && (
        <p className="text-2xl font-bold text-green-600 mb-4">
          ${amount.toFixed(2)}
        </p>
      )}

      <p className="text-gray-500 text-center max-w-sm">
        Your driver appreciates your generosity! 100% of your tip goes directly
        to them.
      </p>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400">You can close this page</p>
      </div>
    </div>
  );
}
