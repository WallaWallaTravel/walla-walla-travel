'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import {
  CreateProposalSchema,
  type CreateProposalInput,
} from '@/lib/schemas/trip-proposal'
import { createProposal, type ActionResult } from '@/lib/actions/trip-proposals'
import { TRIP_TYPE_OPTIONS } from '@/lib/types/trip-proposal'

export default function CreateProposalPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateProposalInput>({
    resolver: zodResolver(CreateProposalSchema) as any,
    defaultValues: {
      trip_type: 'wine_tour',
      party_size: 2,
      tax_rate: 0.091,
      deposit_percentage: 50,
      gratuity_percentage: 0,
    },
  })

  async function onSubmit(data: CreateProposalInput) {
    setServerError(null)
    setSubmitting(true)

    try {
      const result: ActionResult<{ id: number; proposal_number: string }> =
        await createProposal(data)

      if (!result.success) {
        if (typeof result.error === 'string') {
          setServerError(result.error)
        } else {
          setServerError('Please fix the validation errors and try again.')
        }
        return
      }

      // Redirect to the proposal editor
      router.push(`/admin/trip-proposals/${result.data?.id}`)
    } catch {
      setServerError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin/trip-proposals"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium mb-4"
        >
          &larr; Back to Trip Proposals
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Trip Proposal</h1>
        <p className="text-gray-700 mt-1">
          Start a new proposal with customer info and trip details. You can add days, stops, guests,
          and pricing after creation.
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

          <div className="mt-4">
            <label htmlFor="customer_name" className="block text-sm font-medium text-gray-900 mb-1">
              Customer Name *
            </label>
            <input
              id="customer_name"
              type="text"
              {...register('customer_name')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Full name"
            />
            {errors.customer_name && (
              <p className="mt-1 text-sm text-red-600">{errors.customer_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="customer_email" className="block text-sm font-medium text-gray-900 mb-1">
                Email
              </label>
              <input
                id="customer_email"
                type="email"
                {...register('customer_email')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.customer_email && (
                <p className="mt-1 text-sm text-red-600">{errors.customer_email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-900 mb-1">
                Phone
              </label>
              <input
                id="customer_phone"
                type="tel"
                {...register('customer_phone')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.customer_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.customer_phone.message}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="customer_company" className="block text-sm font-medium text-gray-900 mb-1">
              Company
            </label>
            <input
              id="customer_company"
              type="text"
              {...register('customer_company')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Optional"
            />
          </div>
        </fieldset>

        {/* Trip Details */}
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Trip Details
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="trip_type" className="block text-sm font-medium text-gray-900 mb-1">
                Trip Type
              </label>
              <select
                id="trip_type"
                {...register('trip_type')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {TRIP_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.trip_type && (
                <p className="mt-1 text-sm text-red-600">{errors.trip_type.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="party_size" className="block text-sm font-medium text-gray-900 mb-1">
                Party Size *
              </label>
              <input
                id="party_size"
                type="number"
                min={1}
                max={100}
                {...register('party_size')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.party_size && (
                <p className="mt-1 text-sm text-red-600">{errors.party_size.message}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="trip_title" className="block text-sm font-medium text-gray-900 mb-1">
              Trip Title
            </label>
            <input
              id="trip_title"
              type="text"
              {...register('trip_title')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Smith Family Wine Weekend"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-900 mb-1">
                Start Date *
              </label>
              <input
                id="start_date"
                type="date"
                {...register('start_date')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-900 mb-1">
                End Date
              </label>
              <input
                id="end_date"
                type="date"
                {...register('end_date')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-600">Leave blank for single-day trips</p>
            </div>
          </div>
        </fieldset>

        {/* Notes */}
        <fieldset className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <legend className="text-lg font-semibold text-gray-900 px-2">
            Notes
          </legend>

          <div className="mt-4">
            <label htmlFor="introduction" className="block text-sm font-medium text-gray-900 mb-1">
              Introduction
            </label>
            <textarea
              id="introduction"
              rows={3}
              {...register('introduction')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Welcome message for the client..."
            />
          </div>

          <div className="mt-4">
            <label htmlFor="internal_notes" className="block text-sm font-medium text-gray-900 mb-1">
              Internal Notes
            </label>
            <textarea
              id="internal_notes"
              rows={2}
              {...register('internal_notes')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Staff-only notes..."
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
            {submitting ? 'Creating...' : 'Create Proposal'}
          </button>
        </div>
      </form>
    </div>
  )
}
