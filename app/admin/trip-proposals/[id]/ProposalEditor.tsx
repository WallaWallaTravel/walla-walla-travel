'use client'

import { useState, useTransition, useActionState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { SerializedProposal } from './page'
import {
  saveDetailsAction,
  addDayToProposal,
  removeDayFromProposal,
  updateDayInProposal,
  addStopToDay,
  removeStopFromProposal,
  updateStopInProposal,
  addGuestFormAction,
  removeGuestFromProposal,
  saveInclusionForProposal,
  removeInclusionFromProposal,
  savePricingRatesAction,
  sendProposalToClient,
} from '@/lib/actions/trip-proposals'
import { TRIP_TYPES, STOP_TYPES, INCLUSION_TYPES, PRICING_TYPES } from '@/lib/types/trip-proposal'

// ============================================================================
// Types
// ============================================================================

type Tab = 'details' | 'days' | 'guests' | 'pricing'

type SerializedInclusion = SerializedProposal['inclusions'][number]

// ============================================================================
// Helpers
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  viewed: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-amber-50 text-amber-700 border-amber-200',
  booked: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function formatTripType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatStopType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProposalEditor({ proposal }: { proposal: SerializedProposal }) {
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'days', label: 'Days & Stops' },
    { key: 'guests', label: 'Guests' },
    { key: 'pricing', label: 'Pricing' },
  ]

  // Send to client handler
  function handleSend() {
    if (!confirm('Send this proposal to the client? Status will change to "sent".')) return
    startTransition(async () => {
      const result = await sendProposalToClient(proposal.id)
      if (!result.success) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to send')
      } else {
        setError(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* TOP BAR */}
      {/* ================================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/trip-proposals"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {proposal.proposal_number}
              </h1>
              <StatusBadge status={proposal.status} />
              {isPending && (
                <span className="text-xs text-gray-500 animate-pulse">Saving...</span>
              )}
            </div>
            <p className="text-sm text-gray-600">{proposal.customer_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Link
            href={`/trip-proposals/${proposal.proposal_number}?preview=true`}
            target="_blank"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Preview
          </Link>
          {proposal.status === 'draft' && (
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
            >
              Send to Client
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB NAVIGATION */}
      {/* ================================================================ */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================ */}
      {/* TAB CONTENT */}
      {/* ================================================================ */}
      <div>
        {activeTab === 'details' && <DetailsTab proposal={proposal} />}
        {activeTab === 'days' && (
          <DaysStopsTab
            proposal={proposal}
            isPending={isPending}
            startTransition={startTransition}
            router={router}
          />
        )}
        {activeTab === 'guests' && (
          <GuestsTab
            proposal={proposal}
            isPending={isPending}
            startTransition={startTransition}
            router={router}
          />
        )}
        {activeTab === 'pricing' && (
          <PricingTab
            proposal={proposal}
            isPending={isPending}
            startTransition={startTransition}
            router={router}
          />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TAB 1: DETAILS
// ============================================================================

function DetailsTab({ proposal }: { proposal: SerializedProposal }) {
  const [state, action, pending] = useActionState(saveDetailsAction, null)
  const { firstName, lastName } = splitName(proposal.customer_name)

  // Controlled state for date inputs — uncontrolled date inputs inside
  // React 19 <form action={...}> don't reliably display the selected value
  // after the browser's native date picker is used.
  const [startDate, setStartDate] = useState(proposal.start_date)
  const [endDate, setEndDate] = useState(proposal.end_date || '')

  // Sync from server after save (proposal prop updates via revalidatePath)
  const prevProposalRef = useRef(proposal)
  if (prevProposalRef.current !== proposal) {
    prevProposalRef.current = proposal
    setStartDate(proposal.start_date)
    setEndDate(proposal.end_date || '')
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="proposalId" value={proposal.id} />

      {state?.error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{state.error}</div>
      )}
      {state?.success && (
        <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          Details saved successfully.
        </div>
      )}

      {/* Customer Info */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-900 mb-1">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              defaultValue={firstName}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {state?.fieldErrors?.firstName && (
              <span className="text-red-600 text-sm">{state.fieldErrors.firstName}</span>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-900 mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              defaultValue={lastName}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="customer_email" className="block text-sm font-medium text-gray-900 mb-1">
              Email
            </label>
            <input
              id="customer_email"
              name="customer_email"
              type="email"
              defaultValue={proposal.customer_email || ''}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-900 mb-1">
              Phone
            </label>
            <input
              id="customer_phone"
              name="customer_phone"
              type="tel"
              defaultValue={proposal.customer_phone || ''}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="customer_company" className="block text-sm font-medium text-gray-900 mb-1">
              Company
            </label>
            <input
              id="customer_company"
              name="customer_company"
              type="text"
              defaultValue={proposal.customer_company || ''}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* Trip Info */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="trip_type" className="block text-sm font-medium text-gray-900 mb-1">
              Trip Type
            </label>
            <select
              id="trip_type"
              name="trip_type"
              defaultValue={proposal.trip_type}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              {TRIP_TYPES.map((t) => (
                <option key={t} value={t}>{formatTripType(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="trip_title" className="block text-sm font-medium text-gray-900 mb-1">
              Trip Title
            </label>
            <input
              id="trip_title"
              name="trip_title"
              type="text"
              defaultValue={proposal.trip_title || ''}
              placeholder="e.g., Smith Anniversary Weekend"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-900 mb-1">
              Start Date
            </label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-900 mb-1">
              End Date
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="party_size" className="block text-sm font-medium text-gray-900 mb-1">
              Party Size
            </label>
            <input
              id="party_size"
              name="party_size"
              type="number"
              min={1}
              max={100}
              defaultValue={proposal.party_size}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="introduction" className="block text-sm font-medium text-gray-900 mb-1">
              Introduction Text
            </label>
            <textarea
              id="introduction"
              name="introduction"
              rows={4}
              defaultValue={proposal.introduction || ''}
              placeholder="Welcome message shown at the top of the proposal..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="special_notes" className="block text-sm font-medium text-gray-900 mb-1">
              Notes for Client
            </label>
            <textarea
              id="special_notes"
              name="special_notes"
              rows={3}
              defaultValue={proposal.special_notes || ''}
              placeholder="Visible to the client on the proposal..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="internal_notes" className="block text-sm font-medium text-gray-900 mb-1">
              Internal Notes
            </label>
            <textarea
              id="internal_notes"
              name="internal_notes"
              rows={3}
              defaultValue={proposal.internal_notes || ''}
              placeholder="Private notes (not visible to client)..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </section>

      {/* Status Display */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
        <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center gap-3">
          <StatusBadge status={proposal.status} />
          <span className="text-sm text-gray-600">
            Status changes happen via the send/accept workflow.
          </span>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {pending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

// ============================================================================
// TAB 2: DAYS & STOPS
// ============================================================================

function DaysStopsTab({
  proposal,
  isPending,
  startTransition,
  router,
}: {
  proposal: SerializedProposal
  isPending: boolean
  startTransition: (fn: () => Promise<void>) => void
  router: ReturnType<typeof useRouter>
}) {
  const [localDays, setLocalDays] = useState(proposal.days)
  const [actionError, setActionError] = useState<string | null>(null)

  // Sync props to local state when server refreshes
  const prevDaysRef = useRef(proposal.days)
  if (prevDaysRef.current !== proposal.days) {
    prevDaysRef.current = proposal.days
    setLocalDays(proposal.days)
  }

  function handleAddDay() {
    // Next day after the last day's date, or proposal start_date
    const lastDay = localDays[localDays.length - 1]
    let nextDate = proposal.start_date
    if (lastDay?.date) {
      const d = new Date(lastDay.date + 'T12:00:00')
      d.setDate(d.getDate() + 1)
      nextDate = d.toISOString().split('T')[0]
    }

    startTransition(async () => {
      const result = await addDayToProposal(proposal.id, nextDate)
      if (!result.success) {
        setActionError(typeof result.error === 'string' ? result.error : 'Failed to add day')
      } else {
        setActionError(null)
        router.refresh()
      }
    })
  }

  function handleRemoveDay(dayId: number, dayNumber: number) {
    if (!confirm(`Delete Day ${dayNumber} and all its stops? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await removeDayFromProposal(dayId, proposal.id)
      if (!result.success) {
        setActionError(typeof result.error === 'string' ? result.error : 'Failed to remove day')
      } else {
        setActionError(null)
        router.refresh()
      }
    })
  }

  function handleDayDateChange(dayId: number, newDate: string) {
    startTransition(async () => {
      await updateDayInProposal(dayId, proposal.id, { date: newDate })
      router.refresh()
    })
  }

  function handleAddStop(dayId: number) {
    startTransition(async () => {
      const result = await addStopToDay(dayId, proposal.id)
      if (!result.success) {
        setActionError(typeof result.error === 'string' ? result.error : 'Failed to add stop')
      } else {
        setActionError(null)
        router.refresh()
      }
    })
  }

  function handleRemoveStop(stopId: number) {
    startTransition(async () => {
      const result = await removeStopFromProposal(stopId, proposal.id)
      if (!result.success) {
        setActionError(typeof result.error === 'string' ? result.error : 'Failed to remove stop')
      } else {
        setActionError(null)
        router.refresh()
      }
    })
  }

  // Update local stop field
  function updateLocalStop(dayIndex: number, stopIndex: number, field: string, value: string | number | null) {
    setLocalDays((prev) => {
      const newDays = [...prev]
      const newStops = [...newDays[dayIndex].stops]
      newStops[stopIndex] = { ...newStops[stopIndex], [field]: value }
      newDays[dayIndex] = { ...newDays[dayIndex], stops: newStops }
      return newDays
    })
  }

  // Build the full stop data object for saving
  function buildStopData(stop: SerializedProposal['days'][number]['stops'][number]) {
    return {
      stop_type: stop.stop_type as (typeof STOP_TYPES)[number],
      custom_name: stop.custom_name || '',
      custom_description: stop.custom_description || '',
      scheduled_time: stop.scheduled_time || undefined,
      duration_minutes: stop.duration_minutes ?? undefined,
      cost_note: stop.cost_note || '',
      per_person_cost: 0,
      flat_cost: 0,
      reservation_status: 'pending' as const,
    }
  }

  // Save stop on blur
  function handleStopBlur(dayIndex: number, stopIndex: number) {
    const stop = localDays[dayIndex].stops[stopIndex]
    startTransition(async () => {
      await updateStopInProposal(stop.id, proposal.id, buildStopData(stop))
    })
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{actionError}</div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Itinerary</h3>
        <button
          type="button"
          onClick={handleAddDay}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Day
        </button>
      </div>

      {localDays.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-600 mb-3">No days added yet.</p>
          <button
            type="button"
            onClick={handleAddDay}
            disabled={isPending}
            className="text-indigo-600 text-sm font-medium hover:underline"
          >
            Add the first day
          </button>
        </div>
      )}

      {localDays.map((day, dayIndex) => {
        // Format date for display
        const dateDisplay = day.date
          ? new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : ''

        return (
          <div key={day.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Day Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-gray-900">
                  Day {day.day_number}
                </span>
                <span className="text-sm text-gray-600">{dateDisplay}</span>
                <input
                  type="date"
                  value={day.date}
                  onChange={(e) => {
                    const newDate = e.target.value
                    setLocalDays((prev) => {
                      const newDays = [...prev]
                      newDays[dayIndex] = { ...newDays[dayIndex], date: newDate }
                      return newDays
                    })
                  }}
                  onBlur={(e) => handleDayDateChange(day.id, e.target.value)}
                  className="px-2 py-1 rounded border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveDay(day.id, day.day_number)}
                disabled={isPending}
                className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Delete day"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Stops */}
            <div className="p-4 space-y-3">
              {day.stops.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-3">No stops yet.</p>
              )}

              {day.stops.map((stop, stopIndex) => (
                <div key={stop.id} className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <span className="bg-white px-2 py-0.5 rounded border border-gray-200">
                        #{stop.stop_order + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.id)}
                      disabled={isPending}
                      className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete stop"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Stop Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Stop Name</label>
                      <input
                        type="text"
                        value={stop.custom_name || ''}
                        onChange={(e) => updateLocalStop(dayIndex, stopIndex, 'custom_name', e.target.value)}
                        onBlur={() => handleStopBlur(dayIndex, stopIndex)}
                        placeholder="e.g., L'Ecole No. 41"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Stop Type */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={stop.stop_type}
                        onChange={(e) => {
                          updateLocalStop(dayIndex, stopIndex, 'stop_type', e.target.value)
                          // Save immediately on type change
                          const updatedStop = { ...stop, stop_type: e.target.value }
                          startTransition(async () => {
                            await updateStopInProposal(stop.id, proposal.id, buildStopData(updatedStop))
                          })
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      >
                        {STOP_TYPES.map((t) => (
                          <option key={t} value={t}>{formatStopType(t)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Arrival Time */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Arrival Time</label>
                      <input
                        type="time"
                        value={stop.scheduled_time || ''}
                        onChange={(e) => updateLocalStop(dayIndex, stopIndex, 'scheduled_time', e.target.value || null)}
                        onBlur={() => handleStopBlur(dayIndex, stopIndex)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        min={0}
                        value={stop.duration_minutes ?? ''}
                        onChange={(e) => updateLocalStop(dayIndex, stopIndex, 'duration_minutes', e.target.value ? parseInt(e.target.value, 10) : null)}
                        onBlur={() => handleStopBlur(dayIndex, stopIndex)}
                        placeholder="60"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Description */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description / Notes</label>
                      <textarea
                        rows={2}
                        value={stop.custom_description || ''}
                        onChange={(e) => updateLocalStop(dayIndex, stopIndex, 'custom_description', e.target.value)}
                        onBlur={() => handleStopBlur(dayIndex, stopIndex)}
                        placeholder="Details about this stop..."
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    {/* Cost Note (informational only) */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cost Note <span className="text-gray-500 font-normal">(informational only — not a billing field)</span>
                      </label>
                      <input
                        type="text"
                        value={stop.cost_note || ''}
                        onChange={(e) => updateLocalStop(dayIndex, stopIndex, 'cost_note', e.target.value)}
                        onBlur={() => handleStopBlur(dayIndex, stopIndex)}
                        placeholder="e.g., Tasting fee ~$25/pp, paid at winery"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => handleAddStop(day.id)}
                disabled={isPending}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
              >
                + Add Stop
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// TAB 3: GUESTS
// ============================================================================

function GuestsTab({
  proposal,
  isPending,
  startTransition,
  router,
}: {
  proposal: SerializedProposal
  isPending: boolean
  startTransition: (fn: () => Promise<void>) => void
  router: ReturnType<typeof useRouter>
}) {
  const [state, formAction, formPending] = useActionState(addGuestFormAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Reset form on success
  const prevSuccess = useRef(false)
  if (state?.success && !prevSuccess.current) {
    formRef.current?.reset()
    prevSuccess.current = true
  }
  if (!state?.success) {
    prevSuccess.current = false
  }

  function handleRemoveGuest(guestId: number) {
    if (!confirm('Remove this guest?')) return
    startTransition(async () => {
      await removeGuestFromProposal(guestId, proposal.id)
      router.refresh()
    })
  }

  const guestCounts = {
    total: proposal.guests.length,
    confirmed: proposal.guests.filter((g) => g.rsvp_status === 'confirmed').length,
    pending: proposal.guests.filter((g) => g.rsvp_status === 'pending').length,
    declined: proposal.guests.filter((g) => g.rsvp_status === 'declined').length,
  }

  return (
    <div className="space-y-6">
      {/* Add Guest Form */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Add Guest</h4>
        <form ref={formRef} action={formAction}>
          <input type="hidden" name="proposalId" value={proposal.id} />
          {state?.error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{state.error}</div>
          )}
          {state?.success && (
            <div className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-sm mb-3">
              Guest added.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="guest_name" className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                id="guest_name"
                name="name"
                type="text"
                required
                placeholder="Full name"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {state?.fieldErrors?.name && (
                <span className="text-red-600 text-xs">{state.fieldErrors.name}</span>
              )}
            </div>
            <div>
              <label htmlFor="guest_email" className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                id="guest_email"
                name="email"
                type="email"
                placeholder="email@example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="guest_phone" className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                id="guest_phone"
                name="phone"
                type="tel"
                placeholder="(555) 000-0000"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="guest_dietary" className="block text-xs font-medium text-gray-700 mb-1">Dietary Notes</label>
              <input
                id="guest_dietary"
                name="dietary_restrictions"
                type="text"
                placeholder="Allergies, preferences..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={formPending}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {formPending ? 'Adding...' : 'Add Guest'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Guest Count Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
          <div className="text-xl font-bold text-gray-900">{guestCounts.total}</div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
          <div className="text-xl font-bold text-emerald-600">{guestCounts.confirmed}</div>
          <div className="text-xs text-gray-600">Confirmed</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
          <div className="text-xl font-bold text-amber-600">{guestCounts.pending}</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center">
          <div className="text-xl font-bold text-red-600">{guestCounts.declined}</div>
          <div className="text-xs text-gray-600">Declined</div>
        </div>
      </div>

      {/* Guest Table */}
      {proposal.guests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-600">No guests added yet. Use the form above to add guests.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Dietary</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proposal.guests.map((guest) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-50 text-amber-700',
                    confirmed: 'bg-emerald-50 text-emerald-700',
                    declined: 'bg-red-50 text-red-700',
                    maybe: 'bg-blue-50 text-blue-700',
                  }
                  return (
                    <tr key={guest.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {guest.name}
                        {guest.is_primary && (
                          <span className="ml-1.5 text-xs text-indigo-600 font-normal">(Primary)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{guest.email || '—'}</td>
                      <td className="py-3 px-4 text-gray-700">{guest.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[guest.rsvp_status] || statusColors.pending}`}>
                          {guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {guest.dietary_restrictions || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveGuest(guest.id)}
                          disabled={isPending}
                          className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Remove guest"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TAB 4: PRICING
// ============================================================================

const SERVICE_TEMPLATES = [
  { label: 'Airport Transfer', inclusion_type: 'transportation' as const, pricing_type: 'flat' as const, description: 'Airport Transfer' },
  { label: 'Multi-Day Tour', inclusion_type: 'chauffeur' as const, pricing_type: 'per_day' as const, description: 'Chauffeured Tour' },
  { label: 'Planning/Coordination Fee', inclusion_type: 'planning_fee' as const, pricing_type: 'flat' as const, description: 'Planning & Coordination Fee' },
  { label: 'Arranged Tasting Program', inclusion_type: 'arranged_tasting' as const, pricing_type: 'per_person' as const, description: 'Arranged Tasting Program' },
  { label: 'Custom', inclusion_type: 'custom' as const, pricing_type: 'flat' as const, description: '' },
]

function PricingTab({
  proposal,
  isPending,
  startTransition,
  router,
}: {
  proposal: SerializedProposal
  isPending: boolean
  startTransition: (fn: () => Promise<void>) => void
  router: ReturnType<typeof useRouter>
}) {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Local state for inclusion edits
  const [localInclusions, setLocalInclusions] = useState(proposal.inclusions)

  // Sync props
  const prevInclRef = useRef(proposal.inclusions)
  if (prevInclRef.current !== proposal.inclusions) {
    prevInclRef.current = proposal.inclusions
    setLocalInclusions(proposal.inclusions)
  }

  // Local pricing rates
  const [discountPct, setDiscountPct] = useState(proposal.discount_percentage)
  const [taxRate, setTaxRate] = useState(proposal.tax_rate)
  const [gratuityPct, setGratuityPct] = useState(proposal.gratuity_percentage)
  const [depositPct, setDepositPct] = useState(proposal.deposit_percentage)

  // Sync pricing rates from props
  const prevPricingRef = useRef({
    discount_percentage: proposal.discount_percentage,
    tax_rate: proposal.tax_rate,
    gratuity_percentage: proposal.gratuity_percentage,
    deposit_percentage: proposal.deposit_percentage,
  })
  if (
    prevPricingRef.current.discount_percentage !== proposal.discount_percentage ||
    prevPricingRef.current.tax_rate !== proposal.tax_rate ||
    prevPricingRef.current.gratuity_percentage !== proposal.gratuity_percentage ||
    prevPricingRef.current.deposit_percentage !== proposal.deposit_percentage
  ) {
    prevPricingRef.current = {
      discount_percentage: proposal.discount_percentage,
      tax_rate: proposal.tax_rate,
      gratuity_percentage: proposal.gratuity_percentage,
      deposit_percentage: proposal.deposit_percentage,
    }
    setDiscountPct(proposal.discount_percentage)
    setTaxRate(proposal.tax_rate)
    setGratuityPct(proposal.gratuity_percentage)
    setDepositPct(proposal.deposit_percentage)
  }

  // Client-side pricing calculation
  const calcPricing = useCallback(() => {
    const subtotal = localInclusions.reduce((sum, inc) => sum + inc.total_price, 0)
    const discountAmount = subtotal * (discountPct / 100)
    const subtotalAfterDiscount = subtotal - discountAmount
    const taxAmount = subtotalAfterDiscount * taxRate
    const gratuityAmount = subtotalAfterDiscount * (gratuityPct / 100)
    const total = subtotalAfterDiscount + taxAmount + gratuityAmount
    const depositAmount = total * (depositPct / 100)
    const balance = total - depositAmount
    return { subtotal, discountAmount, subtotalAfterDiscount, taxAmount, gratuityAmount, total, depositAmount, balance }
  }, [localInclusions, discountPct, taxRate, gratuityPct, depositPct])

  const pricing = calcPricing()

  // Infer pricing_type from unit field
  function inferPricingType(inc: SerializedInclusion): string {
    if (inc.unit === 'per_person' || inc.unit === 'per_day' || inc.unit === 'flat') return inc.unit
    return 'flat'
  }

  // Build inclusion data with all required fields
  function buildInclusionData(overrides: {
    id?: number
    inclusion_type: (typeof INCLUSION_TYPES)[number]
    description: string
    pricing_type: (typeof PRICING_TYPES)[number]
    unit?: string
    unit_price: number
    quantity: number
    total_price: number
  }) {
    return {
      ...overrides,
      unit: overrides.unit || overrides.pricing_type,
      is_taxable: true,
      sort_order: 0,
      show_on_proposal: true,
    }
  }

  // Add service from template
  function handleAddService(template: typeof SERVICE_TEMPLATES[number]) {
    setShowTemplateMenu(false)
    startTransition(async () => {
      const result = await saveInclusionForProposal(proposal.id, buildInclusionData({
        inclusion_type: template.inclusion_type,
        description: template.description,
        pricing_type: template.pricing_type,
        unit_price: 0,
        quantity: 1,
        total_price: 0,
      }))
      if (!result.success) {
        setActionError(typeof result.error === 'string' ? result.error : 'Failed to add service')
      } else {
        setActionError(null)
        router.refresh()
      }
    })
  }

  // Save inclusion on blur
  function handleInclusionSave(index: number) {
    const inc = localInclusions[index]
    const pricingType = inferPricingType(inc)

    // Calculate total based on pricing type
    let totalPrice = inc.unit_price
    if (pricingType === 'per_person') {
      totalPrice = inc.unit_price * proposal.party_size
    } else if (pricingType === 'per_day') {
      totalPrice = inc.unit_price * inc.quantity
    }

    // Update local total
    setLocalInclusions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], total_price: totalPrice }
      return updated
    })

    startTransition(async () => {
      await saveInclusionForProposal(proposal.id, buildInclusionData({
        id: inc.id,
        inclusion_type: inc.inclusion_type as (typeof INCLUSION_TYPES)[number],
        description: inc.description,
        pricing_type: pricingType as (typeof PRICING_TYPES)[number],
        unit_price: inc.unit_price,
        quantity: inc.quantity,
        total_price: totalPrice,
      }))
      router.refresh()
    })
  }

  function handleRemoveInclusion(inclusionId: number) {
    startTransition(async () => {
      await removeInclusionFromProposal(inclusionId, proposal.id)
      router.refresh()
    })
  }

  // Update local inclusion field
  function updateLocalInclusion(index: number, field: string, value: string | number) {
    setLocalInclusions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Save pricing rates on blur
  function handleSavePricingRates() {
    startTransition(async () => {
      await savePricingRatesAction(proposal.id, {
        discount_percentage: discountPct,
        tax_rate: taxRate,
        gratuity_percentage: gratuityPct,
        deposit_percentage: depositPct,
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      {actionError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{actionError}</div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* SERVICE LINE ITEMS */}
      {/* ------------------------------------------------------------ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Service Line Items</h3>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Service
            </button>
            {showTemplateMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1">
                {SERVICE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => handleAddService(tmpl)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium">{tmpl.label}</span>
                    <span className="text-gray-500 ml-1">({tmpl.pricing_type.replace('_', ' ')})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {localInclusions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-600 mb-3">No service line items yet.</p>
            <p className="text-xs text-gray-500">Add services using the button above. Pricing is calculated from these items only.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Pricing Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Amount</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Total</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {localInclusions.map((inc, index) => {
                    const pricingType = inferPricingType(inc)
                    // Calculate display total
                    let displayTotal = inc.unit_price
                    if (pricingType === 'per_person') displayTotal = inc.unit_price * proposal.party_size
                    else if (pricingType === 'per_day') displayTotal = inc.unit_price * inc.quantity

                    return (
                      <tr key={inc.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={inc.description}
                            onChange={(e) => updateLocalInclusion(index, 'description', e.target.value)}
                            onBlur={() => handleInclusionSave(index)}
                            className="w-full px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm text-gray-900"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={pricingType}
                            onChange={(e) => {
                              updateLocalInclusion(index, 'unit', e.target.value)
                              // Save immediately
                              const updatedInc = { ...inc, unit: e.target.value }
                              const newPricingType = e.target.value
                              let newTotal = updatedInc.unit_price
                              if (newPricingType === 'per_person') newTotal = updatedInc.unit_price * proposal.party_size
                              else if (newPricingType === 'per_day') newTotal = updatedInc.unit_price * updatedInc.quantity

                              setLocalInclusions((prev) => {
                                const updated = [...prev]
                                updated[index] = { ...updated[index], unit: e.target.value, total_price: newTotal }
                                return updated
                              })

                              startTransition(async () => {
                                await saveInclusionForProposal(proposal.id, buildInclusionData({
                                  id: inc.id,
                                  inclusion_type: inc.inclusion_type as (typeof INCLUSION_TYPES)[number],
                                  description: inc.description,
                                  pricing_type: newPricingType as (typeof PRICING_TYPES)[number],
                                  unit_price: updatedInc.unit_price,
                                  quantity: updatedInc.quantity,
                                  total_price: newTotal,
                                }))
                                router.refresh()
                              })
                            }}
                            className="px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm text-gray-900 bg-transparent"
                          >
                            <option value="flat">Flat</option>
                            <option value="per_person">Per Person</option>
                            <option value="per_day">Per Day</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={inc.unit_price}
                            onChange={(e) => updateLocalInclusion(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            onBlur={() => handleInclusionSave(index)}
                            className="w-24 text-right px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm text-gray-900"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {pricingType === 'per_person' ? (
                            <span className="text-sm text-gray-600">{proposal.party_size} ppl</span>
                          ) : pricingType === 'per_day' ? (
                            <input
                              type="number"
                              min={1}
                              value={inc.quantity}
                              onChange={(e) => updateLocalInclusion(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                              onBlur={() => handleInclusionSave(index)}
                              className="w-16 text-right px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm text-gray-900"
                            />
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatCurrency(displayTotal)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveInclusion(inc.id)}
                            disabled={isPending}
                            className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ */}
      {/* PRICING RATES */}
      {/* ------------------------------------------------------------ */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={discountPct}
              onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
              onBlur={handleSavePricingRates}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (decimal)</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.001}
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              onBlur={handleSavePricingRates}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-500 mt-1 block">Default: 0.091 (9.1%)</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gratuity %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={gratuityPct}
              onChange={(e) => setGratuityPct(parseInt(e.target.value, 10) || 0)}
              onBlur={handleSavePricingRates}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Deposit %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={depositPct}
              onChange={(e) => setDepositPct(parseInt(e.target.value, 10) || 0)}
              onBlur={handleSavePricingRates}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="text-xs text-gray-500 mt-1 block">Default: 50%</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* PRICING CALCULATION DISPLAY */}
      {/* ------------------------------------------------------------ */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Summary</h3>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            <PricingRow label="Subtotal (services)" value={pricing.subtotal} />
            {discountPct > 0 && (
              <PricingRow label={`Discount (${discountPct}%)`} value={-pricing.discountAmount} negative />
            )}
            {discountPct > 0 && (
              <PricingRow label="Subtotal After Discount" value={pricing.subtotalAfterDiscount} />
            )}
            <PricingRow label={`Tax (${(taxRate * 100).toFixed(1)}%)`} value={pricing.taxAmount} />
            {gratuityPct > 0 && (
              <PricingRow label={`Gratuity (${gratuityPct}%)`} value={pricing.gratuityAmount} />
            )}
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-base font-bold text-gray-900">{formatCurrency(pricing.total)}</span>
            </div>
            <PricingRow label={`Deposit (${depositPct}%)`} value={pricing.depositAmount} />
            <PricingRow label="Balance Due" value={pricing.balance} bold />
          </div>
        </div>
      </section>
    </div>
  )
}

function PricingRow({
  label,
  value,
  negative,
  bold,
}: {
  label: string
  value: number
  negative?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : negative ? 'text-red-600' : 'text-gray-900'}`}>
        {negative ? '- ' : ''}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  )
}
