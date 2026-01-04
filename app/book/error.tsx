'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function BookingFlowError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Booking flow error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="text-center p-8 max-w-md bg-white rounded-2xl shadow-lg">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Interrupted
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'We encountered an issue processing your booking. Your information has not been lost.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Continue Booking
          </button>
          <Link
            href="/"
            className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Return Home
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Need help? Call us at <a href="tel:+15091234567" className="text-purple-600">(509) 123-4567</a>
        </p>
      </div>
    </div>
  )
}
