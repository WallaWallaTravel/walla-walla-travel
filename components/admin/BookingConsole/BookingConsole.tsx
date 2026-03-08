'use client'

/**
 * BookingConsole Component
 *
 * Internal Booking Console — the tool Ryan uses during phone calls.
 * Split-panel layout:
 * - Left: Customer info, tour details, locations, notes
 * - Right: Availability, vehicles, drivers, live pricing calculator
 *
 * Uses Server Actions for booking creation, local rate-config for pricing,
 * and the existing availability API for vehicle/driver checks.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBooking, type BookingActionResult } from '@/lib/actions/bookings'
import { searchHotels } from '@/lib/actions/booking-queries'
import {
  getHourlyRate,
  formatCurrency,
  defaultRates,
} from '@/lib/rate-config'
import AvailabilityPanel from './AvailabilityPanel'
import VehicleSelector from './VehicleSelector'
import DriverSelector from './DriverSelector'
import {
  CustomerInfo,
  TourDetails,
  AvailabilityResult,
  DEFAULT_CUSTOMER,
  DEFAULT_TOUR,
  REFERRAL_OPTIONS,
  TOUR_TYPE_OPTIONS,
  validateCustomer,
  validateTour,
} from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TAX_RATE = defaultRates.tax_rate
const DEPOSIT_PERCENT = defaultRates.deposit_percentage

// ---------------------------------------------------------------------------
// Number input helpers (select-all on focus, strip leading zeros on blur)
// ---------------------------------------------------------------------------
function selectAllOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select()
}

function stripLeadingZeros(e: React.FocusEvent<HTMLInputElement>) {
  const v = e.target.value
  if (v && /^0\d/.test(v)) {
    e.target.value = String(Number(v))
    e.target.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

const numInputHandlers = {
  onFocus: selectAllOnFocus,
  onBlur: stripLeadingZeros,
}

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ---------------------------------------------------------------------------
// Pricing calculator (pure, client-side)
// ---------------------------------------------------------------------------
function calcPricing(vals: {
  duration: number
  groupSize: number
  date: string
  hourlyRate: number | undefined
  discountPercent: number
  discountDollar: number
  lunchCostPerPerson: number
}) {
  const date = vals.date || new Date().toISOString().slice(0, 10)
  const autoRate = getHourlyRate(vals.groupSize || 1, date)
  const rate = vals.hourlyRate ?? autoRate
  const hours = vals.duration || 0
  const guests = vals.groupSize || 0

  const baseTotal = rate * hours
  const lunchTotal = vals.lunchCostPerPerson * guests
  const subtotalBeforeDiscount = baseTotal + lunchTotal
  const percentOff = subtotalBeforeDiscount * ((vals.discountPercent || 0) / 100)
  const afterPercent = subtotalBeforeDiscount - percentOff
  const afterDollar = Math.max(0, afterPercent - (vals.discountDollar || 0))
  const tax = afterDollar * TAX_RATE
  const total = afterDollar + tax
  const deposit = total * DEPOSIT_PERCENT
  const balance = total - deposit

  return {
    autoRate, rate, hours, guests, baseTotal, lunchTotal,
    subtotalBeforeDiscount, percentOff, afterPercent, afterDollar,
    tax, total, deposit, balance,
  }
}

// ---------------------------------------------------------------------------
// Pickup Location Autocomplete
// ---------------------------------------------------------------------------
function PickupAutocomplete({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)

  const fetchSuggestions = useCallback(async (q: string) => {
    const res = await searchHotels(q)
    if (res.success) setSuggestions(res.hotels)
  }, [])

  useEffect(() => {
    if (value.length >= 1) {
      fetchSuggestions(value)
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [value, fetchSuggestions])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      onChange(suggestions[highlightIdx])
      setOpen(false)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setHighlightIdx(-1)
        }}
        onFocus={() => {
          if (value.length === 0) {
            fetchSuggestions('')
            setOpen(true)
          } else if (suggestions.length > 0) {
            setOpen(true)
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholder="Hotel name or address"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`px-3 py-2 cursor-pointer text-sm ${
                i === highlightIdx ? 'bg-indigo-50 text-indigo-900' : 'text-gray-800 hover:bg-gray-50'
              }`}
              onMouseDown={() => {
                onChange(s)
                setOpen(false)
              }}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function BookingConsole() {
  const router = useRouter()

  // Form state
  const [customer, setCustomer] = useState<CustomerInfo>(DEFAULT_CUSTOMER)
  const [tour, setTour] = useState<TourDetails>(DEFAULT_TOUR)
  const [selectedVehicles, setSelectedVehicles] = useState<number[]>([])
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null)

  // Pricing overrides
  const [hourlyRateOverride, setHourlyRateOverride] = useState<string>('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountDollar, setDiscountDollar] = useState(0)
  const [lunchCostPerPerson, setLunchCostPerPerson] = useState(0)

  // API state
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Debounced values for availability API
  const debouncedDate = useDebounce(tour.date, 500)
  const debouncedTime = useDebounce(tour.start_time, 500)
  const debouncedDuration = useDebounce(tour.duration_hours, 500)
  const debouncedPartySize = useDebounce(tour.party_size, 500)

  // Live pricing
  const pricing = calcPricing({
    duration: tour.duration_hours,
    groupSize: tour.party_size,
    date: tour.date,
    hourlyRate: hourlyRateOverride ? Number(hourlyRateOverride) : undefined,
    discountPercent,
    discountDollar,
    lunchCostPerPerson,
  })

  // Fetch availability when date/time changes
  const fetchAvailability = useCallback(async () => {
    if (!debouncedDate || !debouncedTime || !debouncedDuration || !debouncedPartySize) return
    setIsLoadingAvailability(true)
    try {
      const response = await fetch('/api/admin/availability/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: debouncedDate,
          startTime: debouncedTime,
          durationHours: debouncedDuration,
          partySize: debouncedPartySize,
        }),
      })
      const result = await response.json()
      if (result.success) {
        setAvailability(result.data)
        if (selectedVehicles.length === 0 && result.data.vehicles) {
          const first = result.data.vehicles.find((v: { available: boolean }) => v.available)
          if (first) setSelectedVehicles([first.id])
        }
      }
    } catch {
      // Availability check is best-effort
    } finally {
      setIsLoadingAvailability(false)
    }
  }, [debouncedDate, debouncedTime, debouncedDuration, debouncedPartySize, selectedVehicles.length])

  useEffect(() => { fetchAvailability() }, [fetchAvailability])

  // Handlers
  const handleCustomerChange = (updates: Partial<CustomerInfo>) => {
    setCustomer(prev => ({ ...prev, ...updates }))
    Object.keys(updates).forEach(key => {
      if (errors[key]) {
        setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
      }
    })
  }

  const handleTourChange = (updates: Partial<TourDetails>) => {
    setTour(prev => ({ ...prev, ...updates }))
    if ('date' in updates || 'start_time' in updates) {
      setSelectedVehicles([])
      setSelectedDriver(null)
    }
    Object.keys(updates).forEach(key => {
      if (errors[key]) {
        setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
      }
    })
  }

  // Submit via Server Action
  const handleSave = async () => {
    setSubmitError('')
    setSuccessMessage('')

    const customerErrors = validateCustomer(customer)
    const tourErrors = validateTour(tour)
    const allErrors = { ...customerErrors, ...tourErrors }
    setErrors(allErrors)
    if (Object.keys(allErrors).length > 0) {
      setSubmitError('Please fix the errors above')
      return
    }

    setIsSaving(true)
    try {
      const total = Math.round(pricing.total * 100) / 100
      const deposit = Math.round(pricing.deposit * 100) / 100

      const result: BookingActionResult = await createBooking({
        customerFirstName: customer.first_name,
        customerLastName: customer.last_name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        tripDate: tour.date,
        tourType: tour.tour_type as 'wine_tour' | 'private_transportation' | 'airport_transfer' | 'corporate' | 'wedding' | 'celebration' | 'custom',
        duration: tour.duration_hours,
        groupSize: tour.party_size,
        pickupLocation: tour.pickup_location,
        dropoffLocation: tour.dropoff_location || undefined,
        hourlyRate: hourlyRateOverride ? Number(hourlyRateOverride) : undefined,
        discountPercent: discountPercent || undefined,
        discountDollar: discountDollar || undefined,
        lunchCostPerPerson: lunchCostPerPerson || undefined,
        totalPrice: total,
        depositAmount: deposit,
        driverId: selectedDriver || undefined,
        notes: [
          tour.special_requests,
          tour.wine_preferences ? `Wine preferences: ${tour.wine_preferences}` : '',
          tour.how_did_you_hear ? `Referral: ${tour.how_did_you_hear}` : '',
        ].filter(Boolean).join('\n'),
      })

      if (!result.success) {
        setSubmitError(typeof result.error === 'string' ? result.error : 'Please fix the validation errors')
        return
      }

      setSuccessMessage(`Booking ${result.booking?.booking_number} created!`)
      setTimeout(() => {
        router.push(`/admin/bookings/${result.booking?.id}`)
      }, 1200)
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Input classes
  const inputCls = (field?: string) =>
    `w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
      field && errors[field] ? 'border-red-500' : 'border-gray-300'
    }`

  const smallInputCls = 'w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'

  // Day type display
  const dayTypeLabel = tour.date ? (() => {
    const [y, m, d] = tour.date.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()]
    const isWeekend = dt.getDay() >= 4 && dt.getDay() <= 6
    return `${dayName} — ${isWeekend ? 'Thu-Sat' : 'Sun-Wed'} rates`
  })() : null

  const rateTierLabel = pricing.guests <= 2 ? '1-2' : pricing.guests <= 4 ? '3-4' : pricing.guests <= 6 ? '5-6' : pricing.guests <= 8 ? '7-8' : pricing.guests <= 11 ? '9-11' : '12-14'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Internal Booking Console</h1>
            <p className="text-slate-300 text-sm">Create bookings during phone calls</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/admin/bookings')}
            className="text-white hover:text-slate-300 font-medium"
          >
            Back to Trips
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}
        {submitError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">{submitError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ============================================================ */}
          {/* LEFT PANEL (3 cols) — Customer & Tour Details */}
          {/* ============================================================ */}
          <div className="lg:col-span-3 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-900 mb-1">
                    First Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={customer.first_name}
                    onChange={(e) => handleCustomerChange({ first_name: e.target.value })}
                    className={inputCls('first_name')}
                    placeholder="John"
                  />
                  {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>}
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-900 mb-1">
                    Last Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={customer.last_name}
                    onChange={(e) => handleCustomerChange({ last_name: e.target.value })}
                    className={inputCls('last_name')}
                    placeholder="Smith"
                  />
                  {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>}
                </div>
                <div>
                  <label htmlFor="c_email" className="block text-sm font-medium text-gray-900 mb-1">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="c_email"
                    type="email"
                    value={customer.email}
                    onChange={(e) => handleCustomerChange({ email: e.target.value })}
                    className={inputCls('email')}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="c_phone" className="block text-sm font-medium text-gray-900 mb-1">
                    Phone <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="c_phone"
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => handleCustomerChange({ phone: e.target.value })}
                    className={inputCls('phone')}
                    placeholder="(509) 555-1234"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customer.can_text}
                      onChange={(e) => handleCustomerChange({ can_text: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Customer consents to text messages
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Tour Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tour Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="t_date" className="block text-sm font-medium text-gray-900 mb-1">
                    Tour Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="t_date"
                    type="date"
                    value={tour.date}
                    onChange={(e) => handleTourChange({ date: e.target.value })}
                    className={inputCls('date')}
                  />
                  {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                </div>
                <div>
                  <label htmlFor="t_time" className="block text-sm font-medium text-gray-900 mb-1">
                    Start Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="t_time"
                    type="time"
                    value={tour.start_time}
                    onChange={(e) => handleTourChange({ start_time: e.target.value })}
                    className={inputCls('start_time')}
                  />
                  {errors.start_time && <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>}
                </div>
                <div>
                  <label htmlFor="t_duration" className="block text-sm font-medium text-gray-900 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    id="t_duration"
                    type="number"
                    value={tour.duration_hours}
                    onChange={(e) => handleTourChange({ duration_hours: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={12}
                    className={inputCls()}
                    {...numInputHandlers}
                  />
                </div>
                <div>
                  <label htmlFor="t_party" className="block text-sm font-medium text-gray-900 mb-1">
                    Party Size <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="t_party"
                    type="number"
                    value={tour.party_size}
                    onChange={(e) => handleTourChange({ party_size: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={50}
                    className={inputCls('party_size')}
                    {...numInputHandlers}
                  />
                  {errors.party_size && <p className="mt-1 text-sm text-red-600">{errors.party_size}</p>}
                  {tour.party_size > 14 && (
                    <p className="mt-1 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      Multiple vehicles needed for groups over 14.
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="t_type" className="block text-sm font-medium text-gray-900 mb-1">
                    Tour Type
                  </label>
                  <select
                    id="t_type"
                    value={tour.tour_type}
                    onChange={(e) => handleTourChange({ tour_type: e.target.value as TourDetails['tour_type'] })}
                    className={inputCls()}
                  >
                    {TOUR_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Locations */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Locations</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="t_pickup" className="block text-sm font-medium text-gray-900 mb-1">
                    Pickup Location <span className="text-red-600">*</span>
                  </label>
                  <PickupAutocomplete
                    value={tour.pickup_location}
                    onChange={(v) => handleTourChange({ pickup_location: v })}
                    error={errors.pickup_location}
                  />
                </div>
                <div>
                  <label htmlFor="t_dropoff" className="block text-sm font-medium text-gray-900 mb-1">
                    Dropoff Location
                    <span className="text-gray-500 font-normal ml-2">(if different from pickup)</span>
                  </label>
                  <input
                    id="t_dropoff"
                    type="text"
                    value={tour.dropoff_location}
                    onChange={(e) => handleTourChange({ dropoff_location: e.target.value })}
                    className={inputCls()}
                    placeholder="Same as pickup if left blank"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="t_special" className="block text-sm font-medium text-gray-900 mb-1">
                    Special Requests
                  </label>
                  <textarea
                    id="t_special"
                    value={tour.special_requests}
                    onChange={(e) => handleTourChange({ special_requests: e.target.value })}
                    rows={3}
                    className={inputCls()}
                    placeholder="Dietary restrictions, accessibility needs, celebrations..."
                  />
                </div>
                <div>
                  <label htmlFor="t_wine" className="block text-sm font-medium text-gray-900 mb-1">
                    Wine Preferences
                  </label>
                  <textarea
                    id="t_wine"
                    value={tour.wine_preferences}
                    onChange={(e) => handleTourChange({ wine_preferences: e.target.value })}
                    rows={2}
                    className={inputCls()}
                    placeholder="Red wines preferred, interested in Cab Franc, etc."
                  />
                </div>
                <div>
                  <label htmlFor="t_referral" className="block text-sm font-medium text-gray-900 mb-1">
                    How did you hear about us?
                  </label>
                  <select
                    id="t_referral"
                    value={tour.how_did_you_hear}
                    onChange={(e) => handleTourChange({ how_did_you_hear: e.target.value })}
                    className={inputCls()}
                  >
                    {REFERRAL_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT PANEL (2 cols) — Availability, Vehicles, Pricing */}
          {/* ============================================================ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Availability */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <AvailabilityPanel
                availability={availability}
                isLoading={isLoadingAvailability}
                tour={tour}
              />
            </div>

            {/* Vehicle & Driver Selection */}
            {availability && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                <VehicleSelector
                  vehicles={availability.vehicles}
                  selectedVehicles={selectedVehicles}
                  partySize={tour.party_size}
                  onSelectionChange={setSelectedVehicles}
                />
                <DriverSelector
                  drivers={availability.drivers}
                  selectedDriver={selectedDriver}
                  onSelectionChange={setSelectedDriver}
                />
              </div>
            )}

            {/* Pricing Calculator */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-6">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Pricing Calculator</h3>
                {dayTypeLabel && (
                  <p className="text-xs text-gray-500 mt-0.5">{dayTypeLabel}</p>
                )}
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Hourly Rate */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Hourly Rate
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={hourlyRateOverride}
                      onChange={(e) => setHourlyRateOverride(e.target.value)}
                      placeholder={String(pricing.autoRate)}
                      className={smallInputCls}
                      {...numInputHandlers}
                    />
                    <span className="text-gray-500 text-sm">/hr</span>
                    {hourlyRateOverride && Number(hourlyRateOverride) !== pricing.autoRate && (
                      <button
                        type="button"
                        onClick={() => setHourlyRateOverride('')}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tier: {formatCurrency(pricing.autoRate)}/hr ({rateTierLabel} guests)
                  </p>
                </div>

                {/* Base calculation */}
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-700">
                    {formatCurrency(pricing.rate)}/hr × {pricing.hours}hr = {formatCurrency(pricing.baseTotal)}
                  </span>
                </div>

                {/* Lunch */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Lunch Cost per Person
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={lunchCostPerPerson}
                      onChange={(e) => setLunchCostPerPerson(Number(e.target.value) || 0)}
                      className={smallInputCls}
                      {...numInputHandlers}
                    />
                  </div>
                  {lunchCostPerPerson > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {pricing.guests} guests × {formatCurrency(lunchCostPerPerson)} = {formatCurrency(pricing.lunchTotal)}
                    </p>
                  )}
                </div>

                {/* Staff Discount % */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Staff Discount (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                      className={smallInputCls}
                      {...numInputHandlers}
                    />
                    <span className="text-gray-500 text-sm">%</span>
                    {discountPercent > 0 && (
                      <span className="text-xs text-gray-500">-{formatCurrency(pricing.percentOff)}</span>
                    )}
                  </div>
                </div>

                {/* Fixed Discount $ */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fixed Discount ($)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={discountDollar}
                      onChange={(e) => setDiscountDollar(Number(e.target.value) || 0)}
                      className={smallInputCls}
                      {...numInputHandlers}
                    />
                    <span className="text-gray-500 text-sm">off</span>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(pricing.afterDollar)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (9.1%)</span>
                    <span className="text-gray-900">{formatCurrency(pricing.tax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">{formatCurrency(pricing.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deposit (50%)</span>
                    <span className="font-medium text-indigo-700">{formatCurrency(pricing.deposit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance Due</span>
                    <span className="text-gray-700">{formatCurrency(pricing.balance)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-lg transition-colors"
                >
                  {isSaving ? 'Creating...' : 'Create Booking'}
                </button>
                <p className="text-xs text-gray-500 text-center">
                  Deposit invoice: {formatCurrency(pricing.deposit)} (50% of total)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
