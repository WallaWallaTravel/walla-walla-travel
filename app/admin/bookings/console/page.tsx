/**
 * Internal Booking Console Page
 *
 * /admin/bookings/console
 *
 * Split-panel staff tool for creating bookings during phone calls
 * with real-time availability checking and live pricing.
 */

import { Suspense } from 'react';
import BookingConsole from '@/components/admin/BookingConsole/BookingConsole';

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-[#1E3A5F] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Internal Booking Console</h1>
          <p className="text-blue-200 text-sm">Create bookings during phone calls</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 font-semibold">Loading console...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConsolePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BookingConsole />
    </Suspense>
  );
}

export const metadata = {
  title: 'Booking Console | Admin',
  description: 'Internal booking console for phone bookings',
};
