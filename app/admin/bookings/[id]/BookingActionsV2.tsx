'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateBookingStatus } from '@/lib/actions/booking-mutations'

interface BookingActionsV2Props {
  bookingId: number
  bookingNumber: string
  status: string
  customerEmail: string
}

export function BookingActionsV2({
  bookingId,
  bookingNumber,
  status,
  customerEmail,
}: BookingActionsV2Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleStatusChange = async (
    newStatus: 'confirmed' | 'cancelled' | 'completed',
    label: string
  ) => {
    let reason: string | undefined

    if (newStatus === 'cancelled') {
      const input = prompt('Please provide a reason for cancellation:')
      if (input === null) return
      reason = input
    } else {
      if (!confirm(`${label} this booking?`)) return
    }

    setLoading(newStatus)
    setError(null)
    setSuccess(null)

    const result = await updateBookingStatus(bookingId, {
      status: newStatus,
      reason,
    })

    if (result.success) {
      setSuccess(`Booking ${newStatus} successfully`)
      router.refresh()
    } else {
      setError(
        typeof result.error === 'string'
          ? result.error
          : 'Failed to update status'
      )
    }

    setLoading(null)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {status === 'pending' && (
          <button
            onClick={() => handleStatusChange('confirmed', 'Confirm')}
            disabled={loading !== null}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading === 'confirmed' ? 'Confirming...' : 'Confirm Booking'}
          </button>
        )}

        {(status === 'assigned' || status === 'in_progress') && (
          <button
            onClick={() => handleStatusChange('completed', 'Complete')}
            disabled={loading !== null}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading === 'completed' ? 'Completing...' : 'Mark Completed'}
          </button>
        )}

        <button
          onClick={handlePrint}
          className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors"
        >
          Print Details
        </button>

        {status !== 'cancelled' && status !== 'completed' && (
          <button
            onClick={() => handleStatusChange('cancelled', 'Cancel')}
            disabled={loading !== null}
            className="w-full border border-red-300 hover:bg-red-50 disabled:opacity-50 text-red-600 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading === 'cancelled' ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Booking: {bookingNumber} | Customer: {customerEmail}
      </p>
    </div>
  )
}
