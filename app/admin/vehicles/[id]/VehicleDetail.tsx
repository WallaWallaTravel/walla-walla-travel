'use client'

import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VehicleData {
  id: number
  name: string
  vehicle_number: string | null
  make: string
  model: string
  year: number | null
  color: string | null
  vin: string | null
  license_plate: string | null
  vehicle_type: string | null
  capacity: number | null
  status: string
  is_active: boolean
  brand_id: number | null
  fuel_level: number | null
  current_mileage: number | null
  last_service_mileage: number | null
  next_service_mileage: number | null
  mileage_until_service: number | null
  last_service_date: string | null
  next_service_due: string | null
  last_inspection_date: string | null
  insurance_expiry: string | null
  registration_expiry: string | null
  notes: string | null
  mileageLogs: {
    id: number
    mileage: number
    previous_mileage: number | null
    mileage_change: number | null
    recorded_date: string
    recorded_by: string | null
  }[]
  alerts: {
    id: number
    alert_type: string
    severity: string
    message: string
    created_at: string | null
  }[]
  inspections: {
    id: number
    date: string | null
    type: string | null
    driver_name: string | null
    status: string | null
    defects_found: boolean
    defect_severity: string | null
  }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const now = new Date()
  const target = new Date(dateStr + 'T12:00:00')
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function ExpiryBadge({ dateStr }: { dateStr: string | null }) {
  if (!dateStr) return <span className="text-gray-500 text-sm">No data</span>
  const days = daysUntil(dateStr)
  const formatted = formatDate(dateStr)

  if (days === null) return <span className="text-gray-700 text-sm">{formatted}</span>

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-red-700 font-medium">{formatted}</span>
        <span className="text-red-600 text-xs">({Math.abs(days)}d overdue)</span>
      </span>
    )
  }
  if (days < 30) {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-red-700">{formatted}</span>
        <span className="text-red-600 text-xs">({days}d)</span>
      </span>
    )
  }
  if (days < 90) {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-amber-700">{formatted}</span>
        <span className="text-amber-600 text-xs">({days}d)</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-gray-900">{formatted}</span>
    </span>
  )
}

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

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined ? '—' : String(value)
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{display}</span>
    </div>
  )
}

function formatMileage(mileage: number | null): string {
  if (mileage === null || mileage === undefined) return '—'
  return mileage.toLocaleString('en-US')
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  }
  const c = config[severity] || config.info

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {severity}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VehicleDetail({ vehicle }: { vehicle: VehicleData }) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/vehicles"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center mb-3"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Vehicles
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.name}</h1>
          <StatusBadge status={vehicle.status} />
        </div>
      </div>

      {/* Section 1: Vehicle Profile */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="Name" value={vehicle.name} />
            <InfoRow label="Vehicle Number" value={vehicle.vehicle_number} />
            <InfoRow label="Make" value={vehicle.make} />
            <InfoRow label="Model" value={vehicle.model} />
            <InfoRow label="Year" value={vehicle.year} />
            <InfoRow label="Color" value={vehicle.color} />
          </div>
          <div>
            <InfoRow label="VIN" value={vehicle.vin} />
            <InfoRow label="License Plate" value={vehicle.license_plate} />
            <InfoRow label="Type" value={vehicle.vehicle_type} />
            <InfoRow label="Capacity" value={vehicle.capacity ? `${vehicle.capacity} passengers` : null} />
            <InfoRow label="Fuel Level" value={vehicle.fuel_level !== null ? `${vehicle.fuel_level}%` : null} />
            <InfoRow label="Brand ID" value={vehicle.brand_id} />
          </div>
        </div>
      </div>

      {/* Section 2: Compliance & Service */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance & Service</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Insurance Expiry</p>
              <ExpiryBadge dateStr={vehicle.insurance_expiry} />
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Registration Expiry</p>
              <ExpiryBadge dateStr={vehicle.registration_expiry} />
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Last Inspection</p>
              <ExpiryBadge dateStr={vehicle.last_inspection_date} />
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Service</p>
                  <span className="text-sm text-gray-900">{formatDate(vehicle.last_service_date)}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Next Service Due</p>
                  <ExpiryBadge dateStr={vehicle.next_service_due} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Mileage Tracking</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Current Mileage</p>
                <p className="text-sm font-medium text-gray-900">{formatMileage(vehicle.current_mileage)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Service Mileage</p>
                <p className="text-sm font-medium text-gray-900">{formatMileage(vehicle.last_service_mileage)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Next Service Mileage</p>
                <p className="text-sm font-medium text-gray-900">{formatMileage(vehicle.next_service_mileage)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Miles Until Service</p>
                <p className={`text-sm font-medium ${
                  vehicle.mileage_until_service !== null && vehicle.mileage_until_service < 0
                    ? 'text-red-700'
                    : vehicle.mileage_until_service !== null && vehicle.mileage_until_service < 500
                    ? 'text-amber-700'
                    : 'text-gray-900'
                }`}>
                  {vehicle.mileage_until_service !== null
                    ? formatMileage(vehicle.mileage_until_service)
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Active Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h2>

        {vehicle.alerts.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-10 h-10 text-emerald-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-700 font-medium">No active alerts</p>
            <p className="text-gray-500 text-sm mt-1">All systems normal.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Message</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Severity</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vehicle.alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900 capitalize">{alert.alert_type.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{alert.message}</td>
                      <td className="px-3 py-2"><SeverityBadge severity={alert.severity} /></td>
                      <td className="px-3 py-2 text-sm text-gray-700">{formatDate(alert.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {vehicle.alerts.map((alert) => (
                <div key={alert.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 capitalize">{alert.alert_type.replace(/_/g, ' ')}</span>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="text-sm text-gray-700">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(alert.created_at)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Section 4: Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mileage Logs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Mileage Logs</h2>

          {vehicle.mileageLogs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No mileage logs recorded.</p>
          ) : (
            <div className="space-y-2">
              {vehicle.mileageLogs.map((ml) => (
                <div key={ml.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(ml.recorded_date)}</p>
                    <p className="text-xs text-gray-600">
                      {formatMileage(ml.mileage)} mi
                      {ml.recorded_by && <span className="ml-2 text-gray-500">by {ml.recorded_by}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    {ml.mileage_change !== null && (
                      <p className="text-sm text-gray-900">+{formatMileage(ml.mileage_change)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inspections */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Inspections</h2>

          {vehicle.inspections.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No inspections recorded.</p>
          ) : (
            <div className="space-y-2">
              {vehicle.inspections.map((insp) => (
                <div key={insp.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(insp.date)}</p>
                    <p className="text-xs text-gray-600">
                      {insp.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Inspection'}
                      {insp.driver_name && <span className="ml-2 text-gray-500">by {insp.driver_name}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                      insp.status === 'completed' || insp.status === 'passed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : insp.status === 'failed'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {insp.status || 'pending'}
                    </span>
                    {insp.defects_found && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Defects: {insp.defect_severity || 'yes'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
