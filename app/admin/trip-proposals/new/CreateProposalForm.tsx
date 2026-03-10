'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProposalAction } from '@/lib/actions/trip-proposals'

// ---------------------------------------------------------------------------
// Trip type options
// ---------------------------------------------------------------------------

const TRIP_TYPE_OPTIONS = [
  { value: 'wine_tour', label: 'Wine Tour' },
  { value: 'wine_group', label: 'Wine Group' },
  { value: 'multi_day_wine', label: 'Multi-Day Wine' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'corporate', label: 'Corporate Event' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'family', label: 'Family' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'custom', label: 'Custom' },
  { value: 'other', label: 'Other' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="mt-1 text-sm text-red-600">{errors[0]}</p>
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

const labelClass = 'block text-sm font-medium text-gray-900 mb-1'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateProposalForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState(createProposalAction, null)

  // Redirect on success
  useEffect(() => {
    if (state?.success && state.id) {
      router.push(`/admin/trip-proposals/${state.id}`)
    }
  }, [state, router])

  const fe = state?.fieldErrors || {}

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/trip-proposals"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Trip Proposal</h1>
      </div>

      {/* Server error */}
      {state?.error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {/* Success (brief flash before redirect) */}
      {state?.success && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
          Proposal {state.proposal_number} created. Redirecting...
        </div>
      )}

      <form action={action} className="space-y-4 max-w-3xl">
        {/* ---- Customer Info ---- */}
        <Card title="Customer Info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                className={inputClass}
                placeholder="John"
              />
              <FieldError errors={fe.firstName} />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                className={inputClass}
                placeholder="Smith"
              />
              <FieldError errors={fe.lastName} />
            </div>
            <div>
              <label htmlFor="customer_email" className={labelClass}>
                Email
              </label>
              <input
                id="customer_email"
                name="customer_email"
                type="email"
                className={inputClass}
                placeholder="john@example.com"
              />
              <FieldError errors={fe.customer_email} />
            </div>
            <div>
              <label htmlFor="customer_phone" className={labelClass}>
                Phone
              </label>
              <input
                id="customer_phone"
                name="customer_phone"
                type="tel"
                className={inputClass}
                placeholder="(509) 555-0123"
              />
              <FieldError errors={fe.customer_phone} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="customer_company" className={labelClass}>
                Company <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="customer_company"
                name="customer_company"
                type="text"
                className={inputClass}
                placeholder="Acme Corp"
              />
            </div>
          </div>
        </Card>

        {/* ---- Trip Details ---- */}
        <Card title="Trip Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trip_type" className={labelClass}>
                Trip Type
              </label>
              <select
                id="trip_type"
                name="trip_type"
                defaultValue="wine_tour"
                className={inputClass}
              >
                {TRIP_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="trip_title" className={labelClass}>
                Trip Title{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="trip_title"
                name="trip_title"
                type="text"
                className={inputClass}
                placeholder="e.g. Smith Family Wine Weekend"
              />
            </div>
            <div>
              <label htmlFor="start_date" className={labelClass}>
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                required
                className={inputClass}
              />
              <FieldError errors={fe.start_date} />
            </div>
            <div>
              <label htmlFor="end_date" className={labelClass}>
                End Date{' '}
                <span className="text-gray-400 font-normal">
                  (blank for single day)
                </span>
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="party_size" className={labelClass}>
                Party Size <span className="text-red-500">*</span>
              </label>
              <input
                id="party_size"
                name="party_size"
                type="number"
                min={1}
                max={100}
                defaultValue={2}
                required
                className={inputClass}
                onFocus={(e) => e.target.select()}
              />
              <FieldError errors={fe.party_size} />
            </div>
          </div>
        </Card>

        {/* ---- Financial Defaults ---- */}
        <Card title="Financial Defaults">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="tax_rate" className={labelClass}>
                Tax Rate
              </label>
              <input
                id="tax_rate"
                name="tax_rate"
                type="number"
                step="0.001"
                min={0}
                max={1}
                defaultValue={0.091}
                className={inputClass}
                onFocus={(e) => e.target.select()}
              />
              <p className="mt-0.5 text-xs text-gray-500">
                9.1% = 0.091
              </p>
            </div>
            <div>
              <label htmlFor="deposit_percentage" className={labelClass}>
                Deposit %
              </label>
              <input
                id="deposit_percentage"
                name="deposit_percentage"
                type="number"
                min={0}
                max={100}
                defaultValue={50}
                className={inputClass}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <div>
              <label htmlFor="gratuity_percentage" className={labelClass}>
                Gratuity %
              </label>
              <input
                id="gratuity_percentage"
                name="gratuity_percentage"
                type="number"
                min={0}
                max={100}
                defaultValue={0}
                className={inputClass}
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>
        </Card>

        {/* ---- Notes ---- */}
        <Card title="Notes">
          <div className="space-y-4">
            <div>
              <label htmlFor="introduction" className={labelClass}>
                Introduction{' '}
                <span className="text-gray-400 font-normal">
                  (welcome message for client)
                </span>
              </label>
              <textarea
                id="introduction"
                name="introduction"
                rows={3}
                className={inputClass + ' resize-none'}
                placeholder="Welcome to Walla Walla! We're excited to help plan your..."
              />
            </div>
            <div>
              <label htmlFor="internal_notes" className={labelClass}>
                Internal Notes{' '}
                <span className="text-gray-400 font-normal">(staff only)</span>
              </label>
              <textarea
                id="internal_notes"
                name="internal_notes"
                rows={2}
                className={inputClass + ' resize-none'}
                placeholder="Notes visible only to staff..."
              />
            </div>
          </div>
        </Card>

        {/* ---- Submit ---- */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending || state?.success}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {pending ? 'Creating...' : 'Create Proposal'}
          </button>
          <Link
            href="/admin/trip-proposals"
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
