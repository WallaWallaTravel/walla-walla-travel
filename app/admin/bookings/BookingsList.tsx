'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingRow {
  id: number
  booking_number: string
  customer_name: string
  tour_date: string
  start_time: string | null
  party_size: number
  status: string
  driver_name: string | null
  vehicle_name: string | null
  total_price: number | null
}

interface BookingsListProps {
  bookings: BookingRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'cancelled', 'completed'] as const

function statusBadge(status: string) {
  const s = status.toLowerCase()
  const styles: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    completed: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${styles[s] || styles.completed}`}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time: string | null): string {
  if (!time) return '—'
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookingsList({ bookings }: BookingsListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // ---- Filtered bookings ----
  const filtered = useMemo(() => {
    let list = bookings

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((b) => b.status.toLowerCase() === statusFilter)
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(q) ||
          b.booking_number.toLowerCase().includes(q)
      )
    }

    return list
  }, [bookings, statusFilter, search])

  // ---- Stats ----
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status.toLowerCase() === 'confirmed').length,
      pending: bookings.filter((b) => b.status.toLowerCase() === 'pending').length,
      today: bookings.filter((b) => b.tour_date === todayStr).length,
    }
  }, [bookings])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <Link
          href="/admin/bookings/quick-create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm self-start"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Quick Create
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-emerald-600">Confirmed</div>
          <div className="text-2xl font-bold text-emerald-700">{stats.confirmed}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-amber-600">Pending</div>
          <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-indigo-600">Today</div>
          <div className="text-2xl font-bold text-indigo-700">{stats.today}</div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name or booking #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === opt
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {(search || statusFilter !== 'all') && (
        <p className="text-sm text-gray-600 mb-3">
          Showing {filtered.length} of {bookings.length} bookings
        </p>
      )}

      {/* Empty state */}
      {bookings.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No bookings yet
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Create your first booking to get started.
          </p>
          <Link
            href="/admin/bookings/quick-create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            Quick Create Booking
          </Link>
        </div>
      )}

      {/* No results from filter */}
      {bookings.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-600">
            No bookings match your filters.{' '}
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              className="text-indigo-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          </p>
        </div>
      )}

      {/* ---- Desktop Table ---- */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Booking #
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Time
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">
                    Party
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Driver
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {b.booking_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {b.customer_name}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {formatDate(b.tour_date)}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {formatTime(b.start_time)}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">
                      {b.party_size}
                    </td>
                    <td className="py-3 px-4">{statusBadge(b.status)}</td>
                    <td className="py-3 px-4">
                      {b.driver_name ? (
                        <span className="text-gray-700">{b.driver_name}</span>
                      ) : (
                        <span className="text-red-600 font-medium text-xs">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(b.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Mobile Cards ---- */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-2">
          {filtered.map((b) => (
            <Link
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-600">
                  {b.booking_number}
                </span>
                {statusBadge(b.status)}
              </div>
              <div className="font-semibold text-gray-900 mb-1">
                {b.customer_name}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span>{formatDate(b.tour_date)}</span>
                <span>{formatTime(b.start_time)}</span>
                <span>{b.party_size} guests</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span>
                  {b.driver_name ? (
                    <span className="text-gray-700">{b.driver_name}</span>
                  ) : (
                    <span className="text-red-600 font-medium">Unassigned</span>
                  )}
                </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(b.total_price)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
