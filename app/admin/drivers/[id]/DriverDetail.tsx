'use client'

import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriverData {
  id: number
  name: string
  email: string | null
  phone: string | null
  is_active: boolean
  hired_date: string | null
  employment_status: string
  // License
  license_number: string | null
  license_state: string | null
  license_class: string | null
  license_expiry: string | null
  cdl_endorsements: string[]
  cdl_restrictions: string[]
  // Medical
  medical_cert_number: string | null
  medical_cert_expiry: string | null
  medical_cert_type: string | null
  medical_examiner_name: string | null
  medical_examiner_registry_number: string | null
  // MVR
  mvr_check_date: string | null
  mvr_status: string | null
  mvr_violations: number | null
  // Background
  background_check_date: string | null
  background_check_status: string | null
  // Road test
  road_test_date: string | null
  road_test_passed: boolean | null
  road_test_examiner: string | null
  road_test_vehicle_type: string | null
  // Drug test
  drug_test_date: string | null
  drug_test_status: string | null
  // Annual review
  annual_review_date: string | null
  next_annual_review_date: string | null
  // DQ file
  dq_file_complete: boolean
  dq_file_notes: string | null
  dq_file_last_reviewed: string | null
  // Documents
  documents: {
    id: number
    type: string | null
    name: string | null
    number: string | null
    expiry_date: string | null
    verified: boolean
    url: string | null
  }[]
  // Time cards
  timeCards: {
    id: number
    date: string | null
    clock_in: string | null
    clock_out: string | null
    driving_hours: number | null
    on_duty_hours: number | null
    vehicle: string | null
    status: string | null
  }[]
  // Inspections
  inspections: {
    id: number
    date: string | null
    type: string | null
    vehicle: string | null
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

function formatTime(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
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

function DqItemStatus({ hasData, label }: { hasData: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {hasData ? (
        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      <span className={hasData ? 'text-gray-900' : 'text-gray-500'}>{label}</span>
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value || '—'}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DriverDetail({ driver }: { driver: DriverData }) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/drivers"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center mb-3"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Drivers
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{driver.name}</h1>
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
              driver.is_active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
          >
            {driver.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Section 1: Driver Profile */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Driver Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="Email" value={driver.email} />
            <InfoRow label="Phone" value={driver.phone} />
            <InfoRow label="Hired Date" value={formatDate(driver.hired_date)} />
          </div>
          <div>
            <InfoRow label="Employment Status" value={driver.employment_status ? driver.employment_status.charAt(0).toUpperCase() + driver.employment_status.slice(1) : null} />
            <InfoRow label="Photo" value="Not uploaded" />
          </div>
        </div>
      </div>

      {/* Section 2: DQ File Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">DQ File Status (FMCSA)</h2>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
              driver.dq_file_complete
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {driver.dq_file_complete ? 'Complete' : 'Incomplete'}
          </span>
        </div>

        <div className="space-y-5">
          {/* License */}
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DqItemStatus hasData={!!driver.license_number} label="Commercial Driver's License" />
              <ExpiryBadge dateStr={driver.license_expiry} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <div><p className="text-xs text-gray-500">Number</p><p className="text-sm text-gray-900">{driver.license_number || '—'}</p></div>
              <div><p className="text-xs text-gray-500">State</p><p className="text-sm text-gray-900">{driver.license_state || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Class</p><p className="text-sm text-gray-900">{driver.license_class || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Endorsements</p><p className="text-sm text-gray-900">{driver.cdl_endorsements.length > 0 ? driver.cdl_endorsements.join(', ') : '—'}</p></div>
            </div>
            {driver.cdl_restrictions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">Restrictions</p>
                <p className="text-sm text-gray-900">{driver.cdl_restrictions.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Medical Certificate */}
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DqItemStatus hasData={!!driver.medical_cert_number} label="Medical Certificate" />
              <ExpiryBadge dateStr={driver.medical_cert_expiry} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              <div><p className="text-xs text-gray-500">Number</p><p className="text-sm text-gray-900">{driver.medical_cert_number || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Type</p><p className="text-sm text-gray-900">{driver.medical_cert_type || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Examiner</p><p className="text-sm text-gray-900">{driver.medical_examiner_name || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Registry #</p><p className="text-sm text-gray-900">{driver.medical_examiner_registry_number || '—'}</p></div>
            </div>
          </div>

          {/* MVR */}
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <DqItemStatus hasData={!!driver.mvr_check_date} label="Motor Vehicle Record (MVR)" />
              <span className="text-sm text-gray-700">{formatDate(driver.mvr_check_date)}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              <div><p className="text-xs text-gray-500">Status</p><p className="text-sm text-gray-900">{driver.mvr_status || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Violations</p><p className="text-sm text-gray-900">{driver.mvr_violations ?? '—'}</p></div>
            </div>
          </div>

          {/* Background Check */}
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <DqItemStatus hasData={!!driver.background_check_date} label="Background Check" />
              <span className="text-sm text-gray-700">{formatDate(driver.background_check_date)}</span>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm text-gray-900">{driver.background_check_status || '—'}</p>
            </div>
          </div>

          {/* Road Test */}
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <DqItemStatus hasData={!!driver.road_test_date} label="Road Test" />
              <span className="text-sm text-gray-700">{formatDate(driver.road_test_date)}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              <div>
                <p className="text-xs text-gray-500">Passed</p>
                <p className="text-sm text-gray-900">
                  {driver.road_test_passed === null ? '—' : driver.road_test_passed ? 'Yes' : 'No'}
                </p>
              </div>
              <div><p className="text-xs text-gray-500">Examiner</p><p className="text-sm text-gray-900">{driver.road_test_examiner || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Vehicle Type</p><p className="text-sm text-gray-900">{driver.road_test_vehicle_type || '—'}</p></div>
            </div>
          </div>

          {/* Drug Test */}
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <DqItemStatus hasData={!!driver.drug_test_date} label="Drug Test" />
              <span className="text-sm text-gray-700">{formatDate(driver.drug_test_date)}</span>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm text-gray-900">{driver.drug_test_status || '—'}</p>
            </div>
          </div>

          {/* Annual Review */}
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <DqItemStatus hasData={!!driver.annual_review_date} label="Annual Review" />
              <span className="text-sm text-gray-700">{formatDate(driver.annual_review_date)}</span>
            </div>
            {driver.next_annual_review_date && (
              <div className="mt-2">
                <p className="text-xs text-gray-500">Next Due</p>
                <ExpiryBadge dateStr={driver.next_annual_review_date} />
              </div>
            )}
          </div>

          {/* Overall DQ Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-500">DQ File Complete</p>
                <p className={`text-sm font-medium ${driver.dq_file_complete ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {driver.dq_file_complete ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Last Reviewed</p>
                <p className="text-sm text-gray-900">{formatDate(driver.dq_file_last_reviewed)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm text-gray-900">{driver.dq_file_notes || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Documents */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>

        {driver.documents.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-700 font-medium">No documents uploaded</p>
            <p className="text-gray-500 text-sm mt-1">Upload documents from the driver portal.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Number</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Verified</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {driver.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900 capitalize">{doc.type?.replace(/_/g, ' ') || '—'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{doc.name || '—'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{doc.number || '—'}</td>
                      <td className="px-3 py-2"><ExpiryBadge dateStr={doc.expiry_date} /></td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                          doc.verified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          {doc.verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {doc.url ? (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {driver.documents.map((doc) => (
                <div key={doc.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 capitalize">{doc.type?.replace(/_/g, ' ') || 'Document'}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                      doc.verified
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {doc.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{doc.name || '—'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <ExpiryBadge dateStr={doc.expiry_date} />
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs">
                        View file
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Section 4: Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Cards */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Time Cards</h2>

          {driver.timeCards.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No time cards recorded.</p>
          ) : (
            <div className="space-y-2">
              {driver.timeCards.map((tc) => (
                <div key={tc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(tc.date)}</p>
                    <p className="text-xs text-gray-600">
                      {formatTime(tc.clock_in)} – {formatTime(tc.clock_out)}
                      {tc.vehicle && <span className="ml-2 text-gray-500">{tc.vehicle}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    {tc.on_duty_hours !== null && (
                      <p className="text-sm text-gray-900">{tc.on_duty_hours.toFixed(1)}h</p>
                    )}
                    {tc.status && (
                      <span className={`text-xs ${
                        tc.status === 'approved' ? 'text-emerald-600' :
                        tc.status === 'rejected' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {tc.status}
                      </span>
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

          {driver.inspections.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No inspections recorded.</p>
          ) : (
            <div className="space-y-2">
              {driver.inspections.map((insp) => (
                <div key={insp.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(insp.date)}</p>
                    <p className="text-xs text-gray-600">
                      {insp.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Inspection'}
                      {insp.vehicle && <span className="ml-2 text-gray-500">{insp.vehicle}</span>}
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
