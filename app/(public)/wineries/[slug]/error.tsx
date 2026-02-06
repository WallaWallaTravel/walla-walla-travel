'use client';

import Link from 'next/link';

export default function WineryError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <span className="text-6xl mb-4 block">🍷</span>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Winery Not Found</h2>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t load this winery&apos;s information. It may have been removed or there might be a temporary issue.
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="block w-full bg-[#8B1538] text-white px-4 py-2 rounded-lg hover:bg-[#722F37] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/wineries"
            className="block w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Browse All Wineries
          </Link>
        </div>
      </div>
    </div>
  );
}
