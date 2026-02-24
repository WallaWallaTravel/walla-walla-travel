'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GuestPaymentSuccessPage() {
  const params = useParams();
  const token = params.token as string;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Received!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your payment. You&apos;ll receive a confirmation email shortly.
        </p>

        <Link
          href={`/my-trip/${token}`}
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
        >
          View Trip Details
        </Link>
      </div>
    </div>
  );
}
