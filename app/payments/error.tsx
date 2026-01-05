'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

export default function PaymentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log payment errors - critical for debugging
    logger.error('Payment error', { error })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md bg-white rounded-2xl shadow-lg">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Issue
        </h2>
        <p className="text-gray-600 mb-4">
          {error.message || 'We encountered an issue processing your payment.'}
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Important:</strong> Your card has NOT been charged. Please try again or use a different payment method.
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Try again
          </button>
          <Link
            href="/"
            className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Return Home
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Having trouble? Call <a href="tel:+15091234567" className="text-purple-600">(509) 123-4567</a> for assistance.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-gray-400">Reference: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
