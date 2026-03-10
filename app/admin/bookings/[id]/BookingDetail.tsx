'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  updateBookingStatus,
  updateBookingDriver,
  updateBookingVehicle,
  addBookingNote,
} from '@/lib/actions/bookings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingData {
  id: number
  booking_number: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_id: number | null
  party_size: number
  tour_date: string
  start_time: string | null
  end_time: string | null
  duration_hours: number | null
  pickup_location: string | null
  dropoff_location: string | null
  special_requests: string | null
  wine_tour_preference: string | null
  tour_type: string | null
  status: string
  driver_id: number | null
  driver_name: string | null
  vehicle_id: number | null
  vehicle_name: string | null
  hourly_rate: number | null
  estimated_hours: number | null
  base_price: number | null
  taxes: number | null
  gratuity: number | null
  total_price: number | null
  deposit_amount: number | null
  deposit_paid: boolean
  final_payment_amount: number | null
  final_payment_paid: boolean
  created_at: string
}

export interface PaymentRow {
  id: number
  amount: number
  payment_type: string
  payment_method: string
  status: string
  card_last4: string | null
  created_at: string
}

export interface TimelineEntry {
  id: number
  event_type: string
  event_description: string | null
  created_by_name: string | null
  created_at: string
}

export interface DriverOption {
  id: number
  name: string
}

export interface VehicleOption {
  id: number
  name: string | null
  capacity: number | null
}

interface BookingDetailProps {
  booking: BookingData
  payments: PaymentRow[]
  timeline: TimelineEntry[]
  drivers: DriverOption[]
  vehicles: VehicleOption[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(t: string | null): string {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n)
}

function formatTourType(t: string | null): string {
  if (!t) return '—'
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[s] || statusColors.completed}`}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------

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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BookingDetail({
  booking,
  payments,
  timeline,
  drivers,
  vehicles,
}: BookingDetailProps) {
  const b = booking

  // ---- Status action ----
  const [statusState, statusAction, statusPending] = useActionState(
    updateBookingStatus,
    null
  )
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // ---- Driver action ----
  const [driverState, driverAction, driverPending] = useActionState(
    updateBookingDriver,
    null
  )

  // ---- Vehicle action ----
  const [vehicleState, vehicleAction, vehiclePending] = useActionState(
    updateBookingVehicle,
    null
  )

  // ---- Note action ----
  const [noteState, noteAction, notePending] = useActionState(
    addBookingNote,
    null
  )

  // Status transition buttons
  const nextStatuses: Record<string, string[]> = {
    pending: ['confirmed'],
    confirmed: ['completed'],
    completed: [],
    cancelled: [],
  }
  const available = nextStatuses[b.status.toLowerCase()] || []

  // Balance
  const balance =
    (b.total_price ?? 0) -
    (b.deposit_paid ? (b.deposit_amount ?? 0) : 0) -
    (b.final_payment_paid ? (b.final_payment_amount ?? 0) : 0)

  return (
    <div>
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings"
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
          <h1 className="text-2xl font-bold text-gray-900">
            Booking #{b.booking_number}
          </h1>
          <StatusBadge status={b.status} />
        </div>

        <div className="flex items-center gap-2">
          {/* Status transition buttons */}
          {available.map((s) => (
            <form key={s} action={statusAction}>
              <input type="hidden" name="bookingId" value={b.id} />
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                disabled={statusPending}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {statusPending
                  ? 'Saving...'
                  : `Mark ${s.charAt(0).toUpperCase() + s.slice(1)}`}
              </button>
            </form>
          ))}

          {b.status.toLowerCase() !== 'cancelled' && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
            >
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      {/* Status feedback */}
      {statusState?.error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {statusState.error}
        </div>
      )}
      {statusState?.success && (
        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
          Status updated successfully.
        </div>
      )}

      {/* ---- Grid layout ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Customer info */}
        <Card title="Customer">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Name">{b.customer_name}</Field>
            <Field label="Party Size">{b.party_size} guests</Field>
            <Field label="Email">
              <a
                href={`mailto:${b.customer_email}`}
                className="text-indigo-600 hover:underline"
              >
                {b.customer_email}
              </a>
            </Field>
            <Field label="Phone">
              {b.customer_phone ? (
                <a
                  href={`tel:${b.customer_phone}`}
                  className="text-indigo-600 hover:underline"
                >
                  {b.customer_phone}
                </a>
              ) : (
                '—'
              )}
            </Field>
          </dl>
          {b.customer_id && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Link
                href={`/admin/crm/contacts/${b.customer_id}`}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                View in CRM
              </Link>
            </div>
          )}
        </Card>

        {/* Tour details */}
        <Card title="Tour Details">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Date">{formatDate(b.tour_date)}</Field>
            <Field label="Start Time">{formatTime(b.start_time)}</Field>
            <Field label="Duration">
              {b.duration_hours ? `${b.duration_hours} hours` : (b.estimated_hours ? `${b.estimated_hours} hours (est.)` : '—')}
            </Field>
            <Field label="Tour Type">{formatTourType(b.tour_type)}</Field>
            <Field label="Pickup">{b.pickup_location || '—'}</Field>
            <Field label="Dropoff">{b.dropoff_location || '—'}</Field>
          </dl>
          {(b.special_requests || b.wine_tour_preference) && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {b.special_requests && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    Special Requests
                  </span>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {b.special_requests}
                  </p>
                </div>
              )}
              {b.wine_tour_preference && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    Wine Preference
                  </span>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {b.wine_tour_preference}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Assignment */}
        <Card title="Assignment">
          <div className="space-y-4">
            {/* Driver */}
            <form action={driverAction}>
              <input type="hidden" name="bookingId" value={b.id} />
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Driver
              </label>
              <div className="flex gap-2">
                <select
                  name="driverId"
                  defaultValue={b.driver_id ?? 0}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="0">Unassigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={driverPending}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {driverPending ? '...' : 'Save'}
                </button>
              </div>
              {driverState?.error && (
                <p className="mt-1 text-xs text-red-600">{driverState.error}</p>
              )}
              {driverState?.success && (
                <p className="mt-1 text-xs text-emerald-600">Driver updated.</p>
              )}
            </form>

            {/* Vehicle */}
            <form action={vehicleAction}>
              <input type="hidden" name="bookingId" value={b.id} />
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Vehicle
              </label>
              <div className="flex gap-2">
                <select
                  name="vehicleId"
                  defaultValue={b.vehicle_id ?? 0}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="0">Unassigned</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name || 'Unnamed'} ({v.capacity ?? '?'} seats)
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={vehiclePending}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {vehiclePending ? '...' : 'Save'}
                </button>
              </div>
              {vehicleState?.error && (
                <p className="mt-1 text-xs text-red-600">
                  {vehicleState.error}
                </p>
              )}
              {vehicleState?.success && (
                <p className="mt-1 text-xs text-emerald-600">
                  Vehicle updated.
                </p>
              )}
            </form>
          </div>
        </Card>

        {/* Financial */}
        <Card title="Financial">
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Rate ({b.estimated_hours ?? '?'}h @ {formatCurrency(b.hourly_rate)}/hr)
              </span>
              <span className="text-gray-900">
                {formatCurrency(b.base_price)}
              </span>
            </div>
            {(b.taxes ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">
                  {formatCurrency(b.taxes)}
                </span>
              </div>
            )}
            {(b.gratuity ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Gratuity</span>
                <span className="text-gray-900">
                  {formatCurrency(b.gratuity)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">
                {formatCurrency(b.total_price)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Deposit {b.deposit_paid ? '(paid)' : '(unpaid)'}
              </span>
              <span
                className={
                  b.deposit_paid ? 'text-emerald-600' : 'text-amber-600'
                }
              >
                {formatCurrency(b.deposit_amount)}
              </span>
            </div>
            {b.final_payment_amount != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Final {b.final_payment_paid ? '(paid)' : '(unpaid)'}
                </span>
                <span
                  className={
                    b.final_payment_paid
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }
                >
                  {formatCurrency(b.final_payment_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
              <span className="text-gray-900">Balance Due</span>
              <span
                className={
                  balance <= 0 ? 'text-emerald-600' : 'text-red-600'
                }
              >
                {formatCurrency(Math.max(0, balance))}
              </span>
            </div>
          </dl>

          {/* Payments received */}
          {payments.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Payments Received
              </h3>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="text-gray-700">
                        {p.payment_type}
                      </span>
                      {p.card_last4 && (
                        <span className="text-gray-500 ml-1">
                          ****{p.card_last4}
                        </span>
                      )}
                      <span className="text-gray-400 ml-2 text-xs">
                        {formatDateTime(p.created_at)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {payments.length === 0 && (
            <p className="mt-3 text-sm text-gray-500">No payments yet.</p>
          )}
        </Card>
      </div>

      {/* ---- Timeline / Notes ---- */}
      <Card title="Notes & Activity">
        {/* Add note form */}
        <form action={noteAction} className="mb-4">
          <input type="hidden" name="bookingId" value={b.id} />
          <div className="flex gap-2">
            <textarea
              name="note"
              rows={2}
              placeholder="Add a note..."
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <button
              type="submit"
              disabled={notePending}
              className="self-end px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {notePending ? '...' : 'Add'}
            </button>
          </div>
          {noteState?.error && (
            <p className="mt-1 text-xs text-red-600">{noteState.error}</p>
          )}
          {noteState?.success && (
            <p className="mt-1 text-xs text-emerald-600">Note added.</p>
          )}
        </form>

        {/* Timeline entries */}
        {timeline.length > 0 ? (
          <div className="space-y-3">
            {timeline.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-3 text-sm"
              >
                <div className="mt-1 w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                <div className="flex-1">
                  <p className="text-gray-700">
                    {entry.event_description || entry.event_type}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDateTime(entry.created_at)}
                    {entry.created_by_name && (
                      <span className="ml-1">by {entry.created_by_name}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No activity yet.</p>
        )}
      </Card>

      {/* ---- Cancel Dialog ---- */}
      {showCancelDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCancelDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Cancel Booking
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to cancel booking{' '}
              <strong>#{b.booking_number}</strong> for{' '}
              <strong>{b.customer_name}</strong>? This cannot be undone.
            </p>
            <form
              action={(formData) => {
                setShowCancelDialog(false)
                statusAction(formData)
              }}
            >
              <input type="hidden" name="bookingId" value={b.id} />
              <input type="hidden" name="status" value="cancelled" />
              <textarea
                name="cancellationReason"
                rows={2}
                placeholder="Reason for cancellation (optional)"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCancelDialog(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Cancel Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
