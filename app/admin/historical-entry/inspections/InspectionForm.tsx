'use client'

import { useActionState, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { submitHistoricalInspection } from '@/lib/actions/historical'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Driver {
  id: number
  name: string
}

interface Vehicle {
  id: number
  vehicle_number: string
  make: string
  model: string
}

interface InspectionFormProps {
  drivers: Driver[]
  vehicles: Vehicle[]
}

// Standard FMCSA inspection checklist items
const INSPECTION_ITEMS = {
  exterior: [
    { key: 'tires_condition', label: 'Tires (condition, pressure, tread)' },
    { key: 'wheels_rims', label: 'Wheels and rims' },
    { key: 'lights_front', label: 'Headlights and front signals' },
    { key: 'lights_rear', label: 'Tail lights and brake lights' },
    { key: 'mirrors', label: 'Mirrors (condition, adjustment)' },
    { key: 'windshield_wipers', label: 'Windshield and wipers' },
    { key: 'body_damage', label: 'Body/exterior damage' },
    { key: 'doors_latches', label: 'Doors and latches' },
  ],
  interior: [
    { key: 'seatbelts', label: 'Seatbelts functional' },
    { key: 'horn', label: 'Horn' },
    { key: 'gauges', label: 'Dashboard gauges/warning lights' },
    { key: 'hvac', label: 'Heating/AC system' },
    { key: 'emergency_exit', label: 'Emergency exits functional' },
    { key: 'fire_extinguisher', label: 'Fire extinguisher present/charged' },
    { key: 'first_aid', label: 'First aid kit' },
    { key: 'emergency_triangles', label: 'Emergency reflective triangles' },
  ],
  mechanical: [
    { key: 'brakes', label: 'Brakes (parking and service)' },
    { key: 'steering', label: 'Steering system' },
    { key: 'fluid_levels', label: 'Fluid levels (oil, coolant, etc.)' },
    { key: 'exhaust', label: 'Exhaust system' },
    { key: 'suspension', label: 'Suspension' },
    { key: 'battery', label: 'Battery condition' },
  ],
}

const ALL_CHECKLIST_KEYS = Object.values(INSPECTION_ITEMS).flatMap((cat) => cat.map((item) => item.key))

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectionForm({ drivers, vehicles }: InspectionFormProps) {
  const [state, action, pending] = useActionState(submitHistoricalInspection, null)
  const formRef = useRef<HTMLFormElement>(null)
  const [defectsFound, setDefectsFound] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    const items: Record<string, boolean> = {}
    ALL_CHECKLIST_KEYS.forEach((key) => { items[key] = true })
    return items
  })

  // Handle "Save & Add Another" — reset form after success
  const handleSaveAnother = useCallback(() => {
    if (formRef.current) {
      formRef.current.reset()
      setDefectsFound(false)
      setShowSuccess(false)
      const items: Record<string, boolean> = {}
      ALL_CHECKLIST_KEYS.forEach((key) => { items[key] = true })
      setCheckedItems(items)
    }
  }, [])

  // Show success and auto-reset message
  if (state?.success && !showSuccess) {
    setShowSuccess(true)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/historical-entry"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Historical Entry
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Enter Historical Inspection</h1>
        <p className="text-gray-600 mt-1">Digitize a paper inspection form for compliance records</p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">Inspection record saved successfully!</span>
            </div>
            <button
              type="button"
              onClick={handleSaveAnother}
              className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Save & Add Another
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {state?.error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800">{state.error}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form ref={formRef} action={action} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Original Document Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="originalDocumentDate"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Date on the paper form</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Inspection Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pre_trip">Pre-Trip Inspection</option>
                <option value="post_trip">Post-Trip Inspection</option>
                <option value="dvir">DVIR (Driver Vehicle Inspection Report)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Driver <span className="text-red-500">*</span>
              </label>
              <select
                name="driverId"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select driver...</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <select
                name="vehicleId"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Start Mileage</label>
              <input
                type="number"
                name="startMileage"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Odometer reading"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">End Mileage</label>
              <input
                type="number"
                name="endMileage"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Odometer reading (post-trip)"
              />
            </div>
          </div>
        </div>

        {/* Inspection Checklist */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inspection Checklist</h2>
          <p className="text-sm text-gray-600 mb-4">
            Check each item that was marked satisfactory on the paper form. Uncheck items that were
            not inspected or had issues.
          </p>

          <div className="space-y-6">
            {/* Exterior */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Exterior</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INSPECTION_ITEMS.exterior.map((item) => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      name={`check_${item.key}`}
                      checked={checkedItems[item.key] || false}
                      onChange={(e) => setCheckedItems((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Interior / Safety Equipment */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Interior / Safety Equipment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INSPECTION_ITEMS.interior.map((item) => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      name={`check_${item.key}`}
                      checked={checkedItems[item.key] || false}
                      onChange={(e) => setCheckedItems((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mechanical */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Mechanical</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INSPECTION_ITEMS.mechanical.map((item) => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      name={`check_${item.key}`}
                      checked={checkedItems[item.key] || false}
                      onChange={(e) => setCheckedItems((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Defects Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Defects</h2>

          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="defectsFound"
                value="true"
                checked={defectsFound}
                onChange={(e) => setDefectsFound(e.target.checked)}
                className="h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-900">
                Defects were reported on this inspection
              </span>
            </label>

            {defectsFound && (
              <div className="ml-6 space-y-4 border-l-2 border-red-200 pl-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Defect Severity <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="defectSeverity"
                    required
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="minor">Minor - Vehicle can operate</option>
                    <option value="critical">Critical - Vehicle out of service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Defect Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="defectDescription"
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the defects as written on the paper form..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Fuel Level</label>
              <select
                name="fuelLevel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Not recorded</option>
                <option value="full">Full</option>
                <option value="3/4">3/4</option>
                <option value="1/2">1/2</option>
                <option value="1/4">1/4</option>
                <option value="empty">Empty/Low</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Notes from Paper Form
            </label>
            <textarea
              name="notes"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any notes written on the original inspection form..."
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-900 mb-1">Data Entry Notes</label>
            <textarea
              name="entryNotes"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Notes about this data entry (e.g., 'handwriting unclear on mileage', 'date partially obscured')..."
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/historical-entry"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={pending}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
              pending
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {pending ? 'Saving...' : 'Save Inspection Record'}
          </button>
        </div>
      </form>
    </div>
  )
}
