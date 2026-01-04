'use client'

import { useEffect } from 'react'

export default function PartnerPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Partner portal error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#722F37]/5 to-amber-50">
      <div className="text-center p-8 max-w-md bg-white rounded-2xl shadow-lg">
        <div className="w-16 h-16 bg-[#722F37]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#722F37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'We encountered an issue loading your partner portal. Your data is safe.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-4 py-3 bg-[#722F37] text-white rounded-lg hover:bg-[#5a252c] transition-colors font-medium"
          >
            Try again
          </button>
          <a
            href="/partner-portal/dashboard"
            className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Need help? Email <a href="mailto:partners@wallawalla.travel" className="text-[#722F37]">partners@wallawalla.travel</a>
        </p>
      </div>
    </div>
  )
}
