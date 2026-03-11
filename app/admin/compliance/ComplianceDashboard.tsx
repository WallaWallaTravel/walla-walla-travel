'use client'

import { useState } from 'react'
import Link from 'next/link'

// ============================================================================
// Types
// ============================================================================

export interface DriverCompliance {
  id: number
  name: string
  is_active: boolean
  license_number: string | null
  license_expiry: string | null
  license_class: string | null
  medical_cert_expiry: string | null
  medical_cert_number: string | null
  mvr_check_date: string | null
  mvr_status: string | null
  background_check_date: string | null
  background_check_status: string | null
  road_test_date: string | null
  road_test_passed: boolean | null
  drug_test_date: string | null
  drug_test_status: string | null
  annual_review_date: string | null
  next_annual_review_date: string | null
  dq_file_complete: boolean
  dq_file_last_reviewed: string | null
}

export interface ExpiringDocument {
  type: string
  owner_name: string
  owner_type: 'driver' | 'vehicle' | 'document'
  expiry_date: string
  status: 'expired' | 'critical' | 'warning'
}

export interface VehicleCompliance {
  id: number
  name: string
  vehicle_number: string | null
  is_active: boolean
  insurance_expiry: string | null
  registration_expiry: string | null
  next_service_due: string | null
  last_inspection_date: string | null
}

export interface VehicleAlertRow {
  id: number
  vehicle_id: number
  vehicle_name: string
  alert_type: string
  severity: string
  message: string
  created_at: string | null
}

export interface RecentInspection {
  id: number
  driver_name: string
  vehicle_name: string
  type: string
  status: string | null
  defects_found: boolean
  defect_severity: string | null
  created_at: string
}

export interface ComplianceData {
  summary: {
    total_drivers: number
    active_drivers: number
    total_vehicles: number
    active_vehicles: number
    expired_items: number
    critical_items: number
    warning_items: number
    dq_incomplete: number
    unresolved_alerts: number
    defect_inspections: number
  }
  drivers: DriverCompliance[]
  expirations: ExpiringDocument[]
  vehicles: VehicleCompliance[]
  vehicle_alerts: VehicleAlertRow[]
  inspections: RecentInspection[]
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function statusBadge(status: 'expired' | 'critical' | 'warning') {
  const styles = {
    expired: 'bg-red-100 text-red-800',
    critical: 'bg-amber-100 text-amber-800',
    warning: 'bg-yellow-50 text-yellow-800',
  }
  const labels = {
    expired: 'Expired',
    critical: '< 30 days',
    warning: '< 90 days',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function severityBadge(severity: string) {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-red-50 text-red-700',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-yellow-50 text-yellow-700',
    info: 'bg-blue-50 text-blue-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[severity] || styles.info}`}>
      {severity}
    </span>
  )
}

function dqCheckIcon(value: boolean | string | null, expected?: string) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400" title="Missing">—</span>
  }
  if (typeof value === 'boolean') {
    return value
      ? <span className="text-emerald-600" title="Complete">&#10003;</span>
      : <span className="text-red-600" title="Incomplete">&#10007;</span>
  }
  if (expected && value === expected) {
    return <span className="text-emerald-600" title={value}>&#10003;</span>
  }
  if (expected && value !== expected) {
    return <span className="text-amber-600" title={value}>&#9888;</span>
  }
  return <span className="text-slate-600" title={String(value)}>{String(value)}</span>
}

// ============================================================================
// Component
// ============================================================================

type SectionTab = 'overview' | 'timeline' | 'dq' | 'activity'

export default function ComplianceDashboard({ data }: { data: ComplianceData }) {
  const [activeTab, setActiveTab] = useState<SectionTab>('overview')
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'expired' | 'critical' | 'warning'>('all')
  const [dqFilter, setDqFilter] = useState<'all' | 'incomplete' | 'complete'>('all')

  const { summary, drivers, expirations, vehicles, vehicle_alerts, inspections } = data

  const filteredExpirations = expirations.filter((e) => {
    if (timelineFilter === 'all') return true
    return e.status === timelineFilter
  })

  const activeDrivers = drivers.filter((d) => d.is_active)
  const filteredDrivers = activeDrivers.filter((d) => {
    if (dqFilter === 'all') return true
    if (dqFilter === 'incomplete') return !d.dq_file_complete
    return d.dq_file_complete
  })

  const tabs: { key: SectionTab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Alert Summary' },
    { key: 'timeline', label: 'Expiration Timeline', count: expirations.length },
    { key: 'dq', label: 'DQ File Status', count: summary.dq_incomplete },
    { key: 'activity', label: 'Recent Activity', count: inspections.length },
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Compliance Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">FMCSA readiness overview — driver qualifications, vehicle status, and expiration tracking</p>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <SummaryCard label="Active Drivers" value={summary.active_drivers} total={summary.total_drivers} />
        <SummaryCard label="Active Vehicles" value={summary.active_vehicles} total={summary.total_vehicles} />
        <SummaryCard label="Expired" value={summary.expired_items} variant="red" />
        <SummaryCard label="Expiring < 30d" value={summary.critical_items} variant="amber" />
        <SummaryCard label="DQ Incomplete" value={summary.dq_incomplete} variant={summary.dq_incomplete > 0 ? 'red' : 'green'} />
        <SummaryCard label="Open Alerts" value={summary.unresolved_alerts} variant={summary.unresolved_alerts > 0 ? 'amber' : 'green'} />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewSection
          summary={summary}
          expirations={expirations}
          vehicleAlerts={vehicle_alerts}
          inspections={inspections}
        />
      )}
      {activeTab === 'timeline' && (
        <TimelineSection
          expirations={filteredExpirations}
          filter={timelineFilter}
          onFilterChange={setTimelineFilter}
        />
      )}
      {activeTab === 'dq' && (
        <DQFileSection
          drivers={filteredDrivers}
          filter={dqFilter}
          onFilterChange={setDqFilter}
          totalIncomplete={summary.dq_incomplete}
        />
      )}
      {activeTab === 'activity' && (
        <ActivitySection
          inspections={inspections}
          vehicleAlerts={vehicle_alerts}
        />
      )}
    </div>
  )
}

// ============================================================================
// Summary Card
// ============================================================================

function SummaryCard({
  label,
  value,
  total,
  variant,
}: {
  label: string
  value: number
  total?: number
  variant?: 'red' | 'amber' | 'green'
}) {
  const bgColors = {
    red: 'bg-red-50 border-red-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-emerald-50 border-emerald-200',
  }
  const textColors = {
    red: 'text-red-700',
    amber: 'text-amber-700',
    green: 'text-emerald-700',
  }

  return (
    <div className={`rounded-xl border p-4 ${variant ? bgColors[variant] : 'bg-white border-slate-200'}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${variant ? textColors[variant] : 'text-slate-900'}`}>
        {value}
        {total !== undefined && (
          <span className="text-sm font-normal text-slate-500"> / {total}</span>
        )}
      </p>
    </div>
  )
}

// ============================================================================
// Section: Overview
// ============================================================================

function OverviewSection({
  summary,
  expirations,
  vehicleAlerts,
  inspections,
}: {
  summary: ComplianceData['summary']
  expirations: ExpiringDocument[]
  vehicleAlerts: VehicleAlertRow[]
  inspections: RecentInspection[]
}) {
  const expiredItems = expirations.filter((e) => e.status === 'expired')
  const criticalItems = expirations.filter((e) => e.status === 'critical')
  const urgentItems = [...expiredItems, ...criticalItems].slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Urgent Expirations */}
      {urgentItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Urgent Expirations</h3>
            <p className="text-sm text-slate-600 mt-0.5">Expired or expiring within 30 days</p>
          </div>
          <div className="divide-y divide-slate-100">
            {urgentItems.map((item, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.owner_name}</p>
                  <p className="text-xs text-slate-600">{item.type}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-700">{formatDate(item.expiry_date)}</span>
                  {statusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {urgentItems.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-8 text-center">
          <p className="text-emerald-800 font-medium">No urgent expirations</p>
          <p className="text-sm text-emerald-700 mt-1">All credentials and registrations are current for at least 30 days.</p>
        </div>
      )}

      {/* Unresolved Vehicle Alerts */}
      {vehicleAlerts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Unresolved Vehicle Alerts</h3>
            <p className="text-sm text-slate-600 mt-0.5">{vehicleAlerts.length} open alert{vehicleAlerts.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {vehicleAlerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{alert.vehicle_name}</p>
                  <p className="text-xs text-slate-600">{alert.message}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{formatDateTime(alert.created_at)}</span>
                  {severityBadge(alert.severity)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Defect Inspections */}
      {inspections.filter((i) => i.defects_found).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Recent Inspections with Defects</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {inspections
              .filter((i) => i.defects_found)
              .slice(0, 10)
              .map((insp) => (
                <div key={insp.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {insp.driver_name} — {insp.vehicle_name}
                    </p>
                    <p className="text-xs text-slate-600">{insp.type} inspection</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{formatDateTime(insp.created_at)}</span>
                    {insp.defect_severity && severityBadge(insp.defect_severity)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">DQ File Summary</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Complete</span>
            <span className="text-sm font-medium text-emerald-700">
              {summary.active_drivers - summary.dq_incomplete}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Incomplete</span>
            <span className={`text-sm font-medium ${summary.dq_incomplete > 0 ? 'text-red-700' : 'text-slate-700'}`}>
              {summary.dq_incomplete}
            </span>
          </div>
          <div className="mt-3 bg-slate-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{
                width: summary.active_drivers > 0
                  ? `${((summary.active_drivers - summary.dq_incomplete) / summary.active_drivers) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Inspection Summary (30 days)</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600">Total inspections</span>
            <span className="text-sm font-medium text-slate-900">{inspections.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">With defects</span>
            <span className={`text-sm font-medium ${summary.defect_inspections > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
              {summary.defect_inspections}
            </span>
          </div>
          <div className="mt-3 bg-slate-100 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{
                width: inspections.length > 0
                  ? `${(summary.defect_inspections / inspections.length) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Section: Expiration Timeline
// ============================================================================

function TimelineSection({
  expirations,
  filter,
  onFilterChange,
}: {
  expirations: ExpiringDocument[]
  filter: 'all' | 'expired' | 'critical' | 'warning'
  onFilterChange: (f: 'all' | 'expired' | 'critical' | 'warning') => void
}) {
  const filters: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'expired', label: 'Expired' },
    { key: 'critical', label: '< 30 days' },
    { key: 'warning', label: '30–90 days' },
  ]

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {expirations.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-8 text-center">
          <p className="text-slate-600">No items match this filter.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Expiry Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Days Left</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expirations.map((item, i) => {
                const days = daysUntil(item.expiry_date)
                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm text-slate-900 font-medium">{item.type}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{item.owner_name}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{formatDate(item.expiry_date)}</td>
                    <td className="px-5 py-3 text-sm">
                      <span className={days !== null && days < 0 ? 'text-red-700 font-medium' : 'text-slate-700'}>
                        {days !== null ? (days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`) : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">{statusBadge(item.status)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Section: DQ File Status
// ============================================================================

function DQFileSection({
  drivers,
  filter,
  onFilterChange,
  totalIncomplete,
}: {
  drivers: DriverCompliance[]
  filter: 'all' | 'incomplete' | 'complete'
  onFilterChange: (f: 'all' | 'incomplete' | 'complete') => void
  totalIncomplete: number
}) {
  const filters: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All Active' },
    { key: 'incomplete', label: `Incomplete (${totalIncomplete})` },
    { key: 'complete', label: 'Complete' },
  ]

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {drivers.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-8 text-center">
          <p className="text-slate-600">No drivers match this filter.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Driver</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">CDL</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Medical</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">MVR</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Background</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Road Test</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Drug Test</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Annual Review</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">DQ File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/drivers/${d.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-700">
                      {d.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {d.license_number ? dqCheckIcon(true) : dqCheckIcon(false)}
                    {d.license_expiry && (
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(d.license_expiry)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {d.medical_cert_number ? dqCheckIcon(true) : dqCheckIcon(false)}
                    {d.medical_cert_expiry && (
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(d.medical_cert_expiry)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {dqCheckIcon(d.mvr_status, 'clear')}
                    {d.mvr_check_date && (
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(d.mvr_check_date)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {dqCheckIcon(d.background_check_status, 'clear')}
                    {d.background_check_date && (
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(d.background_check_date)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {dqCheckIcon(d.road_test_passed)}
                    {d.road_test_date && (
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(d.road_test_date)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {dqCheckIcon(d.drug_test_status, 'negative')}
                    {d.drug_test_date && (
                      <div className="text-xs text-slate-500 mt-0.5">{formatDate(d.drug_test_date)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {d.annual_review_date ? dqCheckIcon(true) : dqCheckIcon(false)}
                    {d.next_annual_review_date && (
                      <div className="text-xs text-slate-500 mt-0.5">Next: {formatDate(d.next_annual_review_date)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {dqCheckIcon(d.dq_file_complete)}
                    {d.dq_file_last_reviewed && (
                      <div className="text-xs text-slate-500 mt-0.5">Rev: {formatDate(d.dq_file_last_reviewed)}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Section: Recent Activity
// ============================================================================

function ActivitySection({
  inspections,
  vehicleAlerts,
}: {
  inspections: RecentInspection[]
  vehicleAlerts: VehicleAlertRow[]
}) {
  return (
    <div className="space-y-6">
      {/* Recent Inspections */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Recent Inspections (30 days)</h3>
          <p className="text-sm text-slate-600 mt-0.5">{inspections.length} inspection{inspections.length !== 1 ? 's' : ''}</p>
        </div>
        {inspections.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-slate-600 text-sm">No inspections in the last 30 days.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Driver</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Vehicle</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Defects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm text-slate-700">{formatDateTime(insp.created_at)}</td>
                    <td className="px-5 py-3 text-sm text-slate-900 font-medium">{insp.driver_name}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{insp.vehicle_name}</td>
                    <td className="px-5 py-3 text-sm text-slate-700 capitalize">{insp.type}</td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`capitalize ${insp.status === 'completed' ? 'text-emerald-700' : insp.status === 'pending' ? 'text-amber-700' : 'text-slate-700'}`}>
                        {insp.status || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {insp.defects_found ? (
                        <span className="text-red-700 font-medium">
                          Yes{insp.defect_severity ? ` (${insp.defect_severity})` : ''}
                        </span>
                      ) : (
                        <span className="text-emerald-700">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vehicle Alerts */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Unresolved Vehicle Alerts</h3>
          <p className="text-sm text-slate-600 mt-0.5">{vehicleAlerts.length} open alert{vehicleAlerts.length !== 1 ? 's' : ''}</p>
        </div>
        {vehicleAlerts.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-emerald-700 text-sm font-medium">All vehicle alerts resolved.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {vehicleAlerts.map((alert) => (
              <div key={alert.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{alert.vehicle_name}</p>
                  <p className="text-xs text-slate-600">{alert.alert_type}: {alert.message}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{formatDateTime(alert.created_at)}</span>
                  {severityBadge(alert.severity)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
