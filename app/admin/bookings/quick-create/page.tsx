'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  CreateBookingSchema,
  TOUR_TYPES,
  type CreateBookingInput,
} from '@/lib/schemas/booking'
import { createBooking, type BookingActionResult } from '@/lib/actions/bookings'
import { searchHotels } from '@/lib/actions/booking-queries'
import {
  getHourlyRate,
  formatCurrency,
  defaultRates,
} from '@/lib/rate-config'

const tourTypeLabels: Record<string, string> = {
  wine_tour: 'Wine Tour',
  private_transportation: 'Private Transportation',
  airport_transfer: 'Airport Transfer',
  corporate: 'Corporate Event',
  wedding: 'Wedding',
  celebration: 'Celebration',
  custom: 'Custom',
}

const TAX_RATE = defaultRates.tax_rate
const DEPOSIT_PERCENT = defaultRates.deposit_percentage

// ---------------------------------------------------------------------------
// Shared number-input helpers
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

function numberInputProps() {
  return {
    onFocus: selectAllOnFocus,
    onBlur: stripLeadingZeros,
  }
}

// ---------------------------------------------------------------------------
// Pricing calculator (pure)
// ---------------------------------------------------------------------------
function calcPricing(vals: {
  duration: number
  groupSize: number
  tripDate: string
  hourlyRate: number | undefined
  discountPercent: number
  discountDollar: number
  lunchCostPerPerson: number
}) {
  const date = vals.tripDate || new Date().toISOString().slice(0, 10)
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

  return { autoRate, rate, hours, guests, baseTotal, lunchTotal, subtotalBeforeDiscount, percentOff, afterPercent, afterDollar, tax, total, deposit, balance }
}

// ---------------------------------------------------------------------------
// Autocomplete component
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
  const wrapperRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    <div ref={wrapperRef} className="relative">
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
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
// Main page
// ---------------------------------------------------------------------------
export default function QuickCreateBookingPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(CreateBookingSchema) as any,
    defaultValues: {
      tourType: 'wine_tour',
      duration: 6,
      groupSize: 2,
      dropoffLocation: '',
      discountPercent: 0,
      discountDollar: 0,
      lunchCostPerPerson: 0,
    },
  })

  // Watch fields for live pricing
  const duration = watch('duration')
  const groupSize = watch('groupSize')
  const tripDate = watch('tripDate')
  const hourlyRateOverride = watch('hourlyRate')
  const discountPercent = watch('discountPercent')
  const discountDollar = watch('discountDollar')
  const lunchCostPerPerson = watch('lunchCostPerPerson')
  const pickupLocation = watch('pickupLocation')

  const pricing = calcPricing({
    duration: Number(duration) || 0,
    groupSize: Number(groupSize) || 0,
    tripDate: tripDate || '',
    hourlyRate: hourlyRateOverride ? Number(hourlyRateOverride) : undefined,
    discountPercent: Number(discountPercent) || 0,
    discountDollar: Number(discountDollar) || 0,
    lunchCostPerPerson: Number(lunchCostPerPerson) || 0,
  })

  // Sync computed total into form for submission
  useEffect(() => {
    setValue('totalPrice', Math.round(pricing.total * 100) / 100)
    setValue('depositAmount', Math.round(pricing.deposit * 100) / 100)
  }, [pricing.total, pricing.deposit, setValue])

  async function onSubmit(data: CreateBookingInput) {
    setServerError(null)
    setSubmitting(true)

    try {
      const result: BookingActionResult = await createBooking(data)

      if (!result.success) {
        if (typeof result.error === 'string') {
          setServerError(result.error)
        } else {
          setServerError('Please fix the validation errors above')
        }
        return
      }

      router.push(`/admin/bookings/${result.booking?.id}`)
    } catch {
      setServerError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quick Create Booking</h1>
        <p className="text-gray-600 mt-1">
          Fill in the details — pricing updates live as you type.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT COLUMN — Form fields */}
          <div className="flex-1 space-y-6">
            {/* Customer Information */}
            <fieldset className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <legend className="text-lg font-semibold text-gray-900 px-2">
                Customer Information
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="customerFirstName" className="block text-sm font-medium text-gray-900 mb-1">
                    First Name
                  </label>
                  <input
                    id="customerFirstName"
                    type="text"
                    {...register('customerFirstName')}
                    className={inputClass}
                  />
                  {errors.customerFirstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerFirstName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customerLastName" className="block text-sm font-medium text-gray-900 mb-1">
                    Last Name
                  </label>
                  <input
                    id="customerLastName"
                    type="text"
                    {...register('customerLastName')}
                    className={inputClass}
                  />
                  {errors.customerLastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerLastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-900 mb-1">
                    Email
                  </label>
                  <input
                    id="customerEmail"
                    type="email"
                    {...register('customerEmail')}
                    className={inputClass}
                  />
                  {errors.customerEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerEmail.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-900 mb-1">
                    Phone
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    {...register('customerPhone')}
                    className={inputClass}
                  />
                  {errors.customerPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerPhone.message}</p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Tour Details */}
            <fieldset className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <legend className="text-lg font-semibold text-gray-900 px-2">
                Tour Details
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="tripDate" className="block text-sm font-medium text-gray-900 mb-1">
                    Trip Date
                  </label>
                  <input
                    id="tripDate"
                    type="date"
                    {...register('tripDate')}
                    className={inputClass}
                  />
                  {errors.tripDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.tripDate.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="tourType" className="block text-sm font-medium text-gray-900 mb-1">
                    Tour Type
                  </label>
                  <select
                    id="tourType"
                    {...register('tourType')}
                    className={inputClass}
                  >
                    {TOUR_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {tourTypeLabels[type] || type}
                      </option>
                    ))}
                  </select>
                  {errors.tourType && (
                    <p className="mt-1 text-sm text-red-600">{errors.tourType.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-900 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    min={1}
                    max={12}
                    {...register('duration')}
                    {...numberInputProps()}
                    className={inputClass}
                  />
                  {errors.duration && (
                    <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="groupSize" className="block text-sm font-medium text-gray-900 mb-1">
                    Party Size
                  </label>
                  <input
                    id="groupSize"
                    type="number"
                    min={1}
                    max={14}
                    {...register('groupSize')}
                    {...numberInputProps()}
                    className={inputClass}
                  />
                  {errors.groupSize && (
                    <p className="mt-1 text-sm text-red-600">{errors.groupSize.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="pickupLocation" className="block text-sm font-medium text-gray-900 mb-1">
                    Pickup Location
                  </label>
                  <PickupAutocomplete
                    value={pickupLocation || ''}
                    onChange={(v) => setValue('pickupLocation', v, { shouldValidate: true })}
                    error={errors.pickupLocation?.message}
                  />
                </div>

                <div>
                  <label htmlFor="dropoffLocation" className="block text-sm font-medium text-gray-900 mb-1">
                    Dropoff Location
                  </label>
                  <input
                    id="dropoffLocation"
                    type="text"
                    {...register('dropoffLocation')}
                    className={inputClass}
                    placeholder="Same as pickup if left blank"
                  />
                </div>
              </div>
            </fieldset>

            {/* Notes */}
            <fieldset className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <legend className="text-lg font-semibold text-gray-900 px-2">
                Additional Notes
              </legend>

              <div className="mt-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-900 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  {...register('notes')}
                  className={inputClass}
                  placeholder="Special requests, dietary needs, occasion details..."
                />
              </div>
            </fieldset>

            {/* Submit — visible on mobile below pricing */}
            <div className="flex items-center justify-between pt-2 lg:hidden">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2.5 text-gray-700 font-medium hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN — Pricing Calculator */}
          <div className="w-full lg:w-80 lg:flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm sticky top-6">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Pricing Calculator</h2>
                {tripDate && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(() => {
                      const [y, m, d] = (tripDate as string).split('-').map(Number)
                      const dt = new Date(y, m - 1, d)
                      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()]
                      const isWeekend = dt.getDay() >= 4 && dt.getDay() <= 6
                      return `${day} — ${isWeekend ? 'Thu-Sat' : 'Sun-Wed'} rates`
                    })()}
                  </p>
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
                      step="1"
                      {...register('hourlyRate')}
                      {...numberInputProps()}
                      placeholder={String(pricing.autoRate)}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-gray-500 text-sm">/hr</span>
                    {hourlyRateOverride && Number(hourlyRateOverride) !== pricing.autoRate && (
                      <button
                        type="button"
                        onClick={() => setValue('hourlyRate', undefined)}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                        title="Reset to tier rate"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tier: {formatCurrency(pricing.autoRate)}/hr ({pricing.guests <= 2 ? '1-2' : pricing.guests <= 4 ? '3-4' : pricing.guests <= 6 ? '5-6' : pricing.guests <= 8 ? '7-8' : pricing.guests <= 11 ? '9-11' : '12-14'} guests)
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
                      step="1"
                      {...register('lunchCostPerPerson')}
                      {...numberInputProps()}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  {(Number(lunchCostPerPerson) || 0) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {pricing.guests} guests × {formatCurrency(Number(lunchCostPerPerson))} = {formatCurrency(pricing.lunchTotal)}
                    </p>
                  )}
                </div>

                {/* Discount % */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Staff Discount (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="1"
                      {...register('discountPercent')}
                      {...numberInputProps()}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-gray-500 text-sm">%</span>
                    {(Number(discountPercent) || 0) > 0 && (
                      <span className="text-xs text-gray-500">−{formatCurrency(pricing.percentOff)}</span>
                    )}
                  </div>
                </div>

                {/* Discount $ */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Fixed Discount ($)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      {...register('discountDollar')}
                      {...numberInputProps()}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-gray-500 text-sm">off</span>
                  </div>
                </div>

                {/* Divider */}
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

              {/* Submit — desktop only (in pricing panel) */}
              <div className="hidden lg:flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2.5 text-gray-700 font-medium hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
