'use client'

import { useActionState, useRef, useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { submitHistoricalTimeCard } from '@/lib/actions/historical'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Driver {
  id: number
  name: string
}

interface Vehicle {
  id: number
  vehicle_number: string
  make: string
  model: string
}

interface Booking {
  id: number
  booking_number: string
  customer_name: string
  tour_date: string
}

interface TimeCardFormProps {
  drivers: Driver[]
  vehicles: Vehicle[]
  bookings: Booking[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TimeCardForm({ drivers, vehicles, bookings }: TimeCardFormProps) {
  const [state, action, pending] = useActionState(submitHistoricalTimeCard, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [clockInTime, setClockInTime] = useState('')
  const [clockOutTime, setClockOutTime] = useState('')
  const [onDutyHours, setOnDutyHours] = useState('')

  // Auto-calculate on-duty hours when times change
  useEffect(() => {
    if (selectedDate && clockInTime && clockOutTime) {
      const clockIn = new Date(`${selectedDate}T${clockInTime}`)
      const clockOut = new Date(`${selectedDate}T${clockOutTime}`)
      // Handle overnight shifts
      if (clockOut < clockIn) {
        clockOut.setDate(clockOut.getDate() + 1)
      }
      const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
      if (hours > 0 && hours < 24) {
        setOnDutyHours(hours.toFixed(1))
      }
    }
  }, [selectedDate, clockInTime, clockOutTime])

  // Filter bookings based on selected date
  const filteredBookings = useMemo(() => {
    if (!selectedDate) return bookings
    return bookings.filter((b) => b.tour_date === selectedDate)
  }, [bookings, selectedDate])

  // Handle "Save & Add Another"
  const handleSaveAnother = useCallback(() => {
    if (formRef.current) {
      formRef.current.reset()
      setShowSuccess(false)
      setSelectedDate('')
      setClockInTime('')
      setClockOutTime('')
      setOnDutyHours('')
    }
  }, [])

  if (state?.success && !showSuccess) {
    setShowSuccess(true)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/historical-entry"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Historical Entry
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Enter Historical Time Card</h1>
        <p className="text-gray-600 mt-1">Digitize a paper time sheet or driver work record</p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">Time card record saved successfully!</span>
            </div>
            <button
              type="button"
              onClick={handleSaveAnother}
              className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Save & Add Another
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {state?.error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{state.error}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form ref={formRef} action={action} className="space-y-8">
        {/* Shift Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shift Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="originalDocumentDate"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Date from the paper time sheet</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Driver <span className="text-red-500">*</span>
              </label>
              <select
                name="driverId"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select driver...</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Clock In Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="clockInTime"
                required
                value={clockInTime}
                onChange={(e) => setClockInTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Clock Out Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="clockOutTime"
                required
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">For overnight shifts, this will be treated as the next day</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Vehicle</label>
              <select
                name="vehicleId"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select vehicle (optional)...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Work Reporting Location</label>
              <input
                type="text"
                name="workLocation"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Office, Walla Walla, Customer pickup"
              />
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hours Tracking</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Driving Hours</label>
              <input
                type="number"
                name="drivingHours"
                step="0.1"
                min="0"
                max="24"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Time spent driving"
              />
              <p className="text-xs text-gray-500 mt-1">Hours behind the wheel only</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Total On-Duty Hours</label>
              <input
                type="number"
                name="onDutyHours"
                step="0.1"
                min="0"
                max="24"
                value={onDutyHours}
                onChange={(e) => setOnDutyHours(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Auto-calculated from times"
              />
              <p className="text-xs text-gray-500 mt-1">Total shift time (auto-calculated if blank)</p>
            </div>
          </div>
        </div>

        {/* Link to Booking */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Link to Booking</h2>
          <p className="text-sm text-gray-600 mb-4">
            Optionally link this time card to a specific tour booking. This helps track which tours
            this shift covered.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Related Booking</label>
            <select
              name="bookingId"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No linked booking</option>
              {filteredBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.booking_number} - {booking.customer_name} ({booking.tour_date})
                </option>
              ))}
            </select>
            {selectedDate && filteredBookings.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No completed bookings found for {selectedDate}
              </p>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Data Entry Notes</label>
            <textarea
              name="entryNotes"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes about this data entry (e.g., 'time unclear - estimated from tour schedule', 'paper damaged')..."
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/historical-entry"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={pending}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
              pending
                ? 'bg-green-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {pending ? 'Saving...' : 'Save Time Card Record'}
          </button>
        </div>
      </form>
    </div>
  )
}
