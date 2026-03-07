'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  CreateBookingSchema,
  TOUR_TYPES,
  type CreateBookingInput,
} from '@/lib/schemas/booking'
import { createBooking, type BookingActionResult } from '@/lib/actions/bookings'

const tourTypeLabels: Record<string, string> = {
  wine_tour: 'Wine Tour',
  private_transportation: 'Private Transportation',
  airport_transfer: 'Airport Transfer',
  corporate: 'Corporate Event',
  wedding: 'Wedding',
  celebration: 'Celebration',
  custom: 'Custom',
}

export default function QuickCreateBookingPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(CreateBookingSchema) as any,
    defaultValues: {
      tourType: 'wine_tour',
      duration: 6,
      groupSize: 2,
    },
  })

  async function onSubmit(data: CreateBookingInput) {
    setServerError(null)
    setSubmitting(true)

    try {
      const result: BookingActionResult = await createBooking(data)

      if (!result.success) {
        if (typeof result.error === 'string') {
          setServerError(result.error)
        } else {
          setServerError('Please fix the validation errors above')
        }
        return
      }

      router.push(`/admin/bookings/${result.booking?.id}`)
    } catch {
      setServerError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quick Create Booking</h1>
        <p className="text-gray-600 mt-1">
          Create a new booking with validated form fields and server action.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Information */}
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Customer Information
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="customerFirstName" className="block text-sm font-medium text-gray-900 mb-1">
                First Name
              </label>
              <input
                id="customerFirstName"
                type="text"
                {...register('customerFirstName')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.customerFirstName && (
                <p className="mt-1 text-sm text-red-600">{errors.customerFirstName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="customerLastName" className="block text-sm font-medium text-gray-900 mb-1">
                Last Name
              </label>
              <input
                id="customerLastName"
                type="text"
                {...register('customerLastName')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.customerLastName && (
                <p className="mt-1 text-sm text-red-600">{errors.customerLastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-900 mb-1">
                Email
              </label>
              <input
                id="customerEmail"
                type="email"
                {...register('customerEmail')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.customerEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.customerEmail.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-900 mb-1">
                Phone
              </label>
              <input
                id="customerPhone"
                type="tel"
                {...register('customerPhone')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.customerPhone.message}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Tour Details */}
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Tour Details
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="tripDate" className="block text-sm font-medium text-gray-900 mb-1">
                Trip Date
              </label>
              <input
                id="tripDate"
                type="date"
                {...register('tripDate')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.tripDate && (
                <p className="mt-1 text-sm text-red-600">{errors.tripDate.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="tourType" className="block text-sm font-medium text-gray-900 mb-1">
                Tour Type
              </label>
              <select
                id="tourType"
                {...register('tourType')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {TOUR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tourTypeLabels[type] || type}
                  </option>
                ))}
              </select>
              {errors.tourType && (
                <p className="mt-1 text-sm text-red-600">{errors.tourType.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-900 mb-1">
                Duration (hours)
              </label>
              <input
                id="duration"
                type="number"
                min={1}
                max={12}
                {...register('duration')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="groupSize" className="block text-sm font-medium text-gray-900 mb-1">
                Group Size
              </label>
              <input
                id="groupSize"
                type="number"
                min={1}
                max={50}
                {...register('groupSize')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.groupSize && (
                <p className="mt-1 text-sm text-red-600">{errors.groupSize.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-900 mb-1">
                Deposit ($)
              </label>
              <input
                id="depositAmount"
                type="number"
                min={0}
                step="0.01"
                {...register('depositAmount')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
              />
              {errors.depositAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.depositAmount.message}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="pickupLocation" className="block text-sm font-medium text-gray-900 mb-1">
              Pickup Location
            </label>
            <input
              id="pickupLocation"
              type="text"
              {...register('pickupLocation')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Hotel name or address"
            />
            {errors.pickupLocation && (
              <p className="mt-1 text-sm text-red-600">{errors.pickupLocation.message}</p>
            )}
          </div>
        </fieldset>

        {/* Notes */}
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Additional Notes
          </legend>

          <div className="mt-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-900 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              {...register('notes')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Special requests, dietary needs, occasion details..."
            />
          </div>
        </fieldset>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-gray-700 font-medium hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </form>
    </div>
  )
}
