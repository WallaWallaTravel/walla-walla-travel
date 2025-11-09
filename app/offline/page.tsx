'use client'

// Offline fallback page
import React from 'react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Offline
          </h1>
          <p className="text-gray-600 mb-6">
            It looks like you've lost your internet connection. Don't worry, you can still complete inspections and they'll sync when you're back online.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-blue-900 mb-1">
              ✓ Pre-Trip Inspections
            </h3>
            <p className="text-sm text-blue-700">
              Complete inspections offline - they'll upload automatically
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-blue-900 mb-1">
              ✓ Post-Trip Inspections
            </h3>
            <p className="text-sm text-blue-700">
              Document defects and capture photos for later upload
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-blue-900 mb-1">
              ✓ Driver Dashboard
            </h3>
            <p className="text-sm text-blue-700">
              View cached tour information and itineraries
            </p>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>

        <div className="mt-4">
          <a
            href="/driver-portal/dashboard"
            className="text-blue-600 text-sm hover:underline"
          >
            Go to Dashboard
          </a>
          <span className="text-gray-400 mx-2">•</span>
          <a
            href="/inspections/pre-trip"
            className="text-blue-600 text-sm hover:underline"
          >
            Start Inspection
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center text-sm text-gray-500">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            No internet connection
          </div>
        </div>
      </div>
    </div>
  )
}

