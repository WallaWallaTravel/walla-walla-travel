'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VehicleRow {
  id: number
  name: string
  vehicle_number: string | null
  make: string
  model: string
  year: number | null
  license_plate: string | null
  status: string
  is_active: boolean
  current_mileage: number | null
  capacity: number | null
  insurance_expiry: string | null
  registration_expiry: string | null
  next_service_due: string | null
}

interface VehiclesListProps {
  vehicles: VehicleRow[]
  stats: {
    totalVehicles: number
    activeVehicles: number
    insuranceExpiring: number
    serviceOverdue: number
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = ['all', 'active', 'inactive', 'maintenance'] as const

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Active' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', label: 'Inactive' },
    maintenance: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Maintenance' },
  }
  const c = config[status] || config.active

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  )
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const now = new Date()
  const target = new Date(dateStr + 'T12:00:00')
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function ExpiryDisplay({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) {
    return <span className="text-gray-500 text-sm">No data</span>
  }

  const days = daysUntil(dateStr)
  const formatted = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  let colorClass = 'text-emerald-700'
  if (days !== null) {
    if (days < 0) colorClass = 'text-red-700 font-semibold'
    else if (days < 30) colorClass = 'text-red-700'
    else if (days < 90) colorClass = 'text-amber-700'
  }

  return (
    <span className={`text-sm ${colorClass}`}>
      {formatted}
      {days !== null && days < 90 && (
        <span className="ml-1 text-xs">
          ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`})
        </span>
      )}
    </span>
  )
}

function formatMileage(mileage: number | null): string {
  if (mileage === null || mileage === undefined) return '—'
  return mileage.toLocaleString('en-US')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VehiclesList({ vehicles, stats }: VehiclesListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all')

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter === 'active' && v.status !== 'active') return false
      if (statusFilter === 'inactive' && v.status !== 'inactive') return false
      if (statusFilter === 'maintenance' && v.status !== 'maintenance') return false
      if (search) {
        const q = search.toLowerCase()
        return (
          v.name.toLowerCase().includes(q) ||
          (v.vehicle_number && v.vehicle_number.toLowerCase().includes(q)) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          (v.license_plate && v.license_plate.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [vehicles, search, statusFilter])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
        <p className="text-gray-600 mt-1">Fleet management and compliance status</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVehicles}</p>
              <p className="text-xs text-gray-600">Total Vehicles</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.activeVehicles}</p>
              <p className="text-xs text-gray-600">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.insuranceExpiring}</p>
              <p className="text-xs text-gray-600">Insurance (30d)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.serviceOverdue}</p>
              <p className="text-xs text-gray-600">Service Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, number, make, model, or plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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
      <p className="text-xs text-gray-500 mb-3">
        {filtered.length} vehicle{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p className="text-gray-700 font-medium">No vehicles found</p>
          <p className="text-gray-500 text-sm mt-1">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'No vehicles have been added yet.'}
          </p>
        </div>
      )}

      {/* Desktop Table */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mileage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Insurance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/vehicles/${v.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {v.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatMileage(v.current_mileage)}
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryDisplay dateStr={v.insurance_expiry} />
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryDisplay dateStr={v.registration_expiry} />
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryDisplay dateStr={v.next_service_due} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {v.capacity ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((v) => (
            <Link
              key={v.id}
              href={`/admin/vehicles/${v.id}`}
              className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{v.name}</span>
                <StatusBadge status={v.status} />
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {[v.year, v.make, v.model].filter(Boolean).join(' ')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Mileage</p>
                  <p className="text-gray-700">{formatMileage(v.current_mileage)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="text-gray-700">{v.capacity ?? '—'} passengers</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Insurance</p>
                  <ExpiryDisplay dateStr={v.insurance_expiry} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Registration</p>
                  <ExpiryDisplay dateStr={v.registration_expiry} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Next Service</p>
                  <ExpiryDisplay dateStr={v.next_service_due} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
