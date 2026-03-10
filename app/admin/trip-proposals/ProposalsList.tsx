'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProposalRow {
  id: number
  proposal_number: string
  customer_name: string
  trip_type: string | null
  start_date: string
  end_date: string | null
  party_size: number
  total: number | null
  status: string | null
  created_at: string | null
}

interface ProposalsListProps {
  proposals: ProposalRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  'all',
  'draft',
  'sent',
  'accepted',
  'declined',
  'expired',
] as const

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-amber-50 text-amber-700 border-amber-200',
  converted: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || 'draft').toLowerCase()
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[s] || statusColors.draft}`}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateRange(start: string, end: string | null): string {
  if (!end || end === start) return formatDate(start)
  return `${formatDate(start)} – ${formatDate(end)}`
}

function formatCurrency(n: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatTripType(t: string | null): string {
  if (!t) return '—'
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return formatDate(dateStr.split('T')[0])
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProposalsList({ proposals }: ProposalsListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let list = proposals

    if (statusFilter !== 'all') {
      list = list.filter(
        (p) => (p.status || 'draft').toLowerCase() === statusFilter
      )
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.customer_name.toLowerCase().includes(q) ||
          p.proposal_number.toLowerCase().includes(q)
      )
    }

    return list
  }, [proposals, statusFilter, search])

  const stats = useMemo(() => {
    const count = (s: string) =>
      proposals.filter((p) => (p.status || 'draft').toLowerCase() === s).length
    return {
      total: proposals.length,
      draft: count('draft'),
      sent: count('sent'),
      accepted: count('accepted'),
      expired: count('expired'),
    }
  }, [proposals])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trip Proposals</h1>
        <Link
          href="/admin/trip-proposals/new"
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
          New Proposal
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Draft</div>
          <div className="text-2xl font-bold text-gray-700">{stats.draft}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-blue-600">Sent</div>
          <div className="text-2xl font-bold text-blue-700">{stats.sent}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-emerald-600">Accepted</div>
          <div className="text-2xl font-bold text-emerald-700">
            {stats.accepted}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm font-medium text-amber-600">Expired</div>
          <div className="text-2xl font-bold text-amber-700">
            {stats.expired}
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
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
            placeholder="Search by name or proposal #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
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
          Showing {filtered.length} of {proposals.length} proposals
        </p>
      )}

      {/* Empty state */}
      {proposals.length === 0 && (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No proposals yet
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Create your first trip proposal to get started.
          </p>
          <Link
            href="/admin/trip-proposals/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            Create First Proposal
          </Link>
        </div>
      )}

      {/* No filter results */}
      {proposals.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-600">
            No proposals match your filters.{' '}
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

      {/* Desktop Table */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Proposal #
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Trip Type
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Dates
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">
                    Party
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">
                    Total
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/trip-proposals/${p.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {p.proposal_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {p.customer_name}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {formatTripType(p.trip_type)}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {formatDateRange(p.start_date, p.end_date)}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">
                      {p.party_size}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(p.total)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 text-xs">
                      {relativeTime(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-2">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/admin/trip-proposals/${p.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-600">
                  {p.proposal_number}
                </span>
                <StatusBadge status={p.status} />
              </div>
              <div className="font-semibold text-gray-900 mb-1">
                {p.customer_name}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span>{formatDateRange(p.start_date, p.end_date)}</span>
                <span>{p.party_size} guests</span>
                <span>{formatTripType(p.trip_type)}</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-gray-500 text-xs">
                  {relativeTime(p.created_at)}
                </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(p.total)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
