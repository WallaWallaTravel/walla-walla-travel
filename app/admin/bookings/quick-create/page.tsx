import { Suspense } from 'react'
import BookingConsole from '@/components/admin/BookingConsole/BookingConsole'

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-slate-800 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Internal Booking Console</h1>
          <p className="text-slate-300 text-sm">Create bookings during phone calls</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 mx-auto mb-3 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-gray-600 font-medium">Loading console...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function QuickCreateBookingPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BookingConsole />
    </Suspense>
  )
}
