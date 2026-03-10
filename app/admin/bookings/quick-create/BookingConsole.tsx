'use client'

import { useActionState, useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createBookingAction } from '@/lib/actions/bookings'
import { checkAvailability, type AvailabilityActionResult } from '@/lib/actions/availability'
import { searchHotels, type HotelResult } from '@/lib/actions/hotels'
import { TOUR_TYPES } from '@/lib/schemas/booking'
import { cn } from '@/lib/utils'

// ============================================================================
// PRICING RATES (client-side)
// ============================================================================

function getHourlyRate(partySize: number, dayOfWeek: number): number {
  const isWeekend = dayOfWeek >= 4 && dayOfWeek <= 6 // Thu-Sat
  if (partySize >= 12) return 145
  if (partySize >= 7) return 125
  return isWeekend ? 105 : 95
}

const TAX_RATE = 0.091
const DEPOSIT_PERCENT = 0.5

const TOUR_TYPE_LABELS: Record<string, string> = {
  wine_tour: 'Wine Tour',
  private_transportation: 'Private Transportation',
  corporate: 'Corporate Event',
  wedding: 'Wedding',
  custom: 'Custom',
  airport_transfer: 'Airport Transfer',
  celebration: 'Celebration',
}

// ============================================================================
// HOTEL AUTOCOMPLETE
// ============================================================================

function HotelAutocomplete({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (val: string) => void
  error?: string[]
}) {
  const [results, setResults] = useState<HotelResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    const r = await searchHotels(q)
    setResults(r)
    setOpen(r.length > 0)
    setActiveIdx(-1)
  }, [])

  function handleChange(val: string) {
    onChange(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function handleSelect(hotel: HotelResult) {
    onChange(hotel.name)
    setOpen(false)
    setResults([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-slate-900 mb-1">
        Pickup Location
      </label>
      <input
        type="text"
        name="pickupLocation"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Start typing a hotel name..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder-gray-600"
      />
      {error && <p className="text-red-600 text-sm mt-1">{error[0]}</p>}
      {open && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((hotel, idx) => (
            <li key={hotel.id}>
              <button
                type="button"
                onClick={() => handleSelect(hotel)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm',
                  idx === activeIdx
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className="font-medium">{hotel.name}</span>
                <span className="block text-xs text-slate-500">{hotel.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BookingConsole() {
  const [state, formAction, pending] = useActionState(createBookingAction, null)

  // Form state for live pricing
  const [tripDate, setTripDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [duration, setDuration] = useState(6)
  const [groupSize, setGroupSize] = useState(2)
  const [tourType, setTourType] = useState<string>('wine_tour')
  const [pickupLocation, setPickupLocation] = useState('')

  // Pricing state
  const [hourlyRate, setHourlyRate] = useState(95)
  const [rateOverridden, setRateOverridden] = useState(false)
  const [lunchCost, setLunchCost] = useState(0)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [discountDollar, setDiscountDollar] = useState(0)

  // Availability state
  const [availability, setAvailability] = useState<AvailabilityActionResult | null>(null)
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null)
  const debounceAvail = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Auto-set hourly rate based on tier
  useEffect(() => {
    if (rateOverridden) return
    if (!tripDate) return
    const date = new Date(tripDate + 'T12:00:00')
    const dow = date.getDay()
    setHourlyRate(getHourlyRate(groupSize, dow))
  }, [tripDate, groupSize, rateOverridden])

  // Fetch availability when date/time/duration change
  useEffect(() => {
    if (!tripDate || !startTime) return
    clearTimeout(debounceAvail.current)
    debounceAvail.current = setTimeout(async () => {
      setLoadingAvail(true)
      try {
        const result = await checkAvailability({
          date: tripDate,
          startTime,
          durationHours: duration,
          partySize: groupSize,
        })
        setAvailability(result)
      } catch {
        setAvailability(null)
      } finally {
        setLoadingAvail(false)
      }
    }, 500)
    return () => clearTimeout(debounceAvail.current)
  }, [tripDate, startTime, duration, groupSize])

  // Pricing calculations
  const baseTotal = hourlyRate * duration
  const lunchTotal = lunchCost * groupSize
  const subtotalBeforeDiscount = baseTotal + lunchTotal
  const percentDiscount = subtotalBeforeDiscount * (discountPercent / 100)
  const subtotal = subtotalBeforeDiscount - percentDiscount - discountDollar
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax
  const deposit = total * DEPOSIT_PERCENT
  const balance = total - deposit

  function resetRate() {
    setRateOverridden(false)
    if (tripDate) {
      const date = new Date(tripDate + 'T12:00:00')
      setHourlyRate(getHourlyRate(groupSize, date.getDay()))
    }
  }

  function handleNumberFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select()
  }

  function handleNumberBlur(
    e: React.FocusEvent<HTMLInputElement>,
    setter: (v: number) => void
  ) {
    const val = parseFloat(e.target.value)
    setter(isNaN(val) ? 0 : val)
  }

  // Success screen
  if (state?.success && state.booking) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Booking Created</h2>
        <p className="text-slate-600 mb-1">
          Booking #{state.booking.booking_number}
        </p>
        <p className="text-slate-600 mb-6">
          Total: ${total.toFixed(2)} &middot; Deposit: ${deposit.toFixed(2)}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/admin/bookings/${state.booking.id}`}
            className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            View Booking
          </Link>
          <Link
            href="/admin/bookings/quick-create"
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Create Another
          </Link>
        </div>
      </div>
    )
  }

  const availData = availability?.success ? availability.data : null

  return (
    <div>
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 rounded-xl mb-6">
        <h1 className="text-lg font-bold">Internal Booking Console</h1>
        <p className="text-sm text-slate-300 mt-0.5">
          Create bookings during phone calls
        </p>
      </div>

      {state?.error && typeof state.error === 'string' && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-sm">
          {state.error}
        </div>
      )}

      <form action={formAction}>
        {/* Hidden fields for pricing data */}
        <input type="hidden" name="totalPrice" value={total.toFixed(2)} />
        <input type="hidden" name="depositAmount" value={deposit.toFixed(2)} />
        <input type="hidden" name="hourlyRate" value={hourlyRate} />
        <input type="hidden" name="discountPercent" value={discountPercent} />
        <input type="hidden" name="discountDollar" value={discountDollar} />
        <input type="hidden" name="lunchCostPerPerson" value={lunchCost} />
        {selectedDriver && <input type="hidden" name="driverId" value={selectedDriver} />}
        {selectedVehicle && <input type="hidden" name="vehicleId" value={selectedVehicle} />}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN — Form (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Customer Section */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">First Name</label>
                  <input
                    type="text"
                    name="customerFirstName"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {state?.fieldErrors?.customerFirstName && (
                    <p className="text-red-600 text-sm mt-1">{state.fieldErrors.customerFirstName[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="customerLastName"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {state?.fieldErrors?.customerLastName && (
                    <p className="text-red-600 text-sm mt-1">{state.fieldErrors.customerLastName[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Email</label>
                  <input
                    type="email"
                    name="customerEmail"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {state?.fieldErrors?.customerEmail && (
                    <p className="text-red-600 text-sm mt-1">{state.fieldErrors.customerEmail[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="customerPhone"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {state?.fieldErrors?.customerPhone && (
                    <p className="text-red-600 text-sm mt-1">{state.fieldErrors.customerPhone[0]}</p>
                  )}
                </div>
              </div>
              <label className="flex items-center gap-2 mt-4 text-sm text-slate-700">
                <input type="checkbox" name="smsConsent" className="rounded border-slate-300" />
                Customer consents to SMS updates
              </label>
            </section>

            {/* Tour Section */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Tour Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Trip Date</label>
                  <input
                    type="date"
                    name="tripDate"
                    required
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {state?.fieldErrors?.tripDate && (
                    <p className="text-red-600 text-sm mt-1">{state.fieldErrors.tripDate[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Duration (hours)</label>
                  <input
                    type="number"
                    name="duration"
                    min={1}
                    max={12}
                    step={0.5}
                    value={duration}
                    onFocus={handleNumberFocus}
                    onChange={(e) => setDuration(parseFloat(e.target.value) || 1)}
                    onBlur={(e) => handleNumberBlur(e, setDuration)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {state?.fieldErrors?.duration && (
                    <p className="text-red-600 text-sm mt-1">{state.fieldErrors.duration[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Party Size</label>
                  <input
                    type="number"
                    name="groupSize"
                    min={1}
                    max={50}
                    value={groupSize}
                    onFocus={handleNumberFocus}
                    onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                    onBlur={(e) => handleNumberBlur(e, (v) => setGroupSize(Math.max(1, Math.round(v))))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {state?.fieldErrors?.groupSize && (
                    <p className="text-red-600 text-sm mt-1">{state.fieldErrors.groupSize[0]}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-900 mb-1">Tour Type</label>
                  <select
                    name="tourType"
                    value={tourType}
                    onChange={(e) => setTourType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    {TOUR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TOUR_TYPE_LABELS[t] || t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Location Section */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Locations</h2>
              <div className="space-y-4">
                <HotelAutocomplete
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  error={state?.fieldErrors?.pickupLocation}
                />
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    Dropoff Location
                  </label>
                  <input
                    type="text"
                    name="dropoffLocation"
                    placeholder="Same as pickup if left blank"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder-gray-600"
                  />
                </div>
              </div>
            </section>

            {/* Notes Section */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Notes</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    Special Requests
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    Wine Preferences
                  </label>
                  <textarea
                    name="winePreferences"
                    rows={2}
                    placeholder="Red, white, specific wineries..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder-gray-600"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN — Availability + Pricing (2/5) */}
          <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* Availability Panel */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Availability</h2>

              {!tripDate ? (
                <p className="text-sm text-slate-600">Select a date to check availability.</p>
              ) : loadingAvail ? (
                <div className="space-y-3">
                  <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                </div>
              ) : availData ? (
                <div className="space-y-4">
                  {/* Status */}
                  <div className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium',
                    availData.available
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  )}>
                    {availData.available ? 'Available' : 'Conflicts found'}
                  </div>

                  {/* Warnings */}
                  {availData.warnings.length > 0 && (
                    <div className="space-y-1">
                      {availData.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                          {w}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Vehicles */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Vehicles
                    </h3>
                    <div className="space-y-1.5">
                      {availData.vehicles.map((v) => (
                        <label
                          key={v.id}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors',
                            selectedVehicle === v.id
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:bg-slate-50',
                            !v.available && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <input
                            type="radio"
                            name="_vehicleSelect"
                            checked={selectedVehicle === v.id}
                            onChange={() => v.available && setSelectedVehicle(v.id)}
                            disabled={!v.available}
                            className="text-slate-900"
                          />
                          <span className="flex-1 font-medium text-slate-900">{v.name}</span>
                          <span className="text-xs text-slate-600">Cap: {v.capacity}</span>
                          {v.capacity >= groupSize && v.available && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                              Fits party
                            </span>
                          )}
                          {!v.available && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              Busy
                            </span>
                          )}
                        </label>
                      ))}
                      {availData.vehicles.length === 0 && (
                        <p className="text-sm text-slate-600">No vehicles found.</p>
                      )}
                    </div>
                  </div>

                  {/* Drivers */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Drivers
                    </h3>
                    <div className="space-y-1.5">
                      {availData.drivers.map((d) => (
                        <label
                          key={d.id}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors',
                            selectedDriver === d.id
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:bg-slate-50',
                            !d.available && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <input
                            type="radio"
                            name="_driverSelect"
                            checked={selectedDriver === d.id}
                            onChange={() => d.available && setSelectedDriver(d.id)}
                            disabled={!d.available}
                            className="text-slate-900"
                          />
                          <span className="flex-1 font-medium text-slate-900">{d.name}</span>
                          {d.available ? (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                              Available
                            </span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              Busy
                            </span>
                          )}
                        </label>
                      ))}
                      {availData.drivers.length === 0 && (
                        <p className="text-sm text-slate-600">No drivers found.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : availability && !availability.success ? (
                <p className="text-sm text-red-600">{availability.error}</p>
              ) : null}
            </section>

            {/* Pricing Calculator */}
            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Pricing</h2>

              <div className="space-y-3">
                {/* Hourly Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-slate-900">Hourly Rate</label>
                    {rateOverridden && (
                      <button
                        type="button"
                        onClick={resetRate}
                        className="text-xs text-blue-700 hover:underline"
                      >
                        Reset to tier
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">$</span>
                    <input
                      type="number"
                      value={hourlyRate}
                      min={0}
                      step={5}
                      onFocus={handleNumberFocus}
                      onChange={(e) => {
                        setHourlyRate(parseFloat(e.target.value) || 0)
                        setRateOverridden(true)
                      }}
                      className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Base calc display */}
                <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-700">
                  ${hourlyRate}/hr &times; {duration}hr = ${baseTotal.toFixed(2)}
                </div>

                {/* Lunch cost */}
                <div>
                  <label className="text-sm font-medium text-slate-900 mb-1 block">
                    Lunch Cost / Person
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">$</span>
                    <input
                      type="number"
                      value={lunchCost}
                      min={0}
                      step={5}
                      onFocus={handleNumberFocus}
                      onChange={(e) => setLunchCost(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  {lunchCost > 0 && (
                    <p className="text-xs text-slate-600 mt-1">
                      ${lunchCost} &times; {groupSize} guests = ${lunchTotal.toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Discounts */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-1 block">
                      Staff Discount (%)
                    </label>
                    <input
                      type="number"
                      value={discountPercent}
                      min={0}
                      max={100}
                      onFocus={handleNumberFocus}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900 mb-1 block">
                      Fixed Discount ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">$</span>
                      <input
                        type="number"
                        value={discountDollar}
                        min={0}
                        onFocus={handleNumberFocus}
                        onChange={(e) => setDiscountDollar(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-slate-200 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
                  </div>
                  {(discountPercent > 0 || discountDollar > 0) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Discounts</span>
                      <span className="text-emerald-700">
                        -${(percentDiscount + discountDollar).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax (9.1%)</span>
                    <span className="text-slate-900">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2">
                    <span className="text-slate-900">Total</span>
                    <span className="text-slate-900">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Deposit (50%)</span>
                    <span className="font-medium text-slate-900">${deposit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Balance Due</span>
                    <span className="text-slate-900">${balance.toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full mt-3 px-4 py-3 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending ? 'Creating...' : 'Create Booking'}
                </button>

                <p className="text-xs text-slate-600 text-center">
                  Deposit invoice: ${deposit.toFixed(2)} (50% of total)
                </p>
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
  )
}
