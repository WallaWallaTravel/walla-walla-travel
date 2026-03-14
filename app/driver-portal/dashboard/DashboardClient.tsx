'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import type { DriverTour } from '@/lib/services/driver.service'

interface Props {
  tours: DriverTour[]
  viewMode: 'upcoming' | 'today'
  selectedDate: string
  driverName: string
}

function formatTime(time: string): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`
}

function extractDateString(dateValue: string | null | undefined): string | null {
  if (!dateValue || typeof dateValue !== 'string') return null

  const cleanDate = String(dateValue).trim()
  if (!cleanDate || cleanDate === 'undefined' || cleanDate === 'null') return null

  let datePart = cleanDate
  if (cleanDate.includes('T')) {
    datePart = cleanDate.split('T')[0]
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null

  const parsed = new Date(datePart + 'T12:00:00')
  if (isNaN(parsed.getTime())) return null

  return datePart
}

function formatDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return 'Unknown Date'

  const cleanDate = String(dateStr).trim()
  if (!cleanDate || cleanDate === 'undefined' || cleanDate === 'null') return 'Unknown Date'

  let datePart = cleanDate
  if (cleanDate.includes('T')) {
    datePart = cleanDate.split('T')[0]
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return 'Invalid Date'

  const date = new Date(datePart + 'T12:00:00')
  if (isNaN(date.getTime())) return 'Invalid Date'

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const tomorrow = new Date(todayDate)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === todayDate.getTime()) {
    return 'Today'
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow'
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatFullDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return ''

  const cleanDate = String(dateStr).trim()
  if (!cleanDate || cleanDate === 'undefined' || cleanDate === 'null') return ''

  let datePart = cleanDate
  if (cleanDate.includes('T')) {
    datePart = cleanDate.split('T')[0]
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return ''

  const date = new Date(datePart + 'T12:00:00')
  if (isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function generateMapsLink(tour: DriverTour): string {
  if (!tour.stops || tour.stops.length === 0) return '#'
  const waypoints = tour.stops.map(stop => encodeURIComponent(stop.address)).join('|')
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(tour.pickup_location)}&destination=${encodeURIComponent(tour.dropoff_location)}&waypoints=${waypoints}`
}

function groupToursByDate(tours: DriverTour[]): Record<string, DriverTour[]> {
  return tours.reduce(
    (acc, tour) => {
      const date = extractDateString(tour.tour_date)
      if (!date) return acc
      if (!acc[date]) acc[date] = []
      acc[date].push(tour)
      return acc
    },
    {} as Record<string, DriverTour[]>
  )
}

// Compact TourCard for upcoming list
interface TourCardProps {
  tour: DriverTour
  compact: boolean
  onViewDetails: (bookingId: number) => void
}

function TourCard({ tour, compact, onViewDetails }: TourCardProps) {
  if (compact) {
    return (
      <div className="bg-white rounded-lg overflow-hidden border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex items-stretch">
          {/* Time Badge */}
          <div className="bg-[#1E3A5F] p-4 flex flex-col items-center justify-center min-w-[90px]">
            <div className="text-white text-lg font-bold leading-tight">
              {formatTime(tour.pickup_time)}
            </div>
            <div className="text-[#BCCCDC] text-xs mt-0.5">Pickup</div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{tour.customer_name}</h3>
                <p className="text-slate-500 text-sm">
                  {tour.party_size} guests &bull; {tour.stops?.length || 0} stops
                </p>
                {tour.pickup_location && (
                  <p className="text-slate-500 text-sm mt-0.5 truncate max-w-[200px]">
                    {tour.pickup_location}
                  </p>
                )}
              </div>
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ml-2">
                #{tour.booking_id}
              </span>
            </div>

            {tour.driver_notes && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-800">
                {tour.driver_notes}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col border-l border-slate-200">
            <a
              href={generateMapsLink(tour)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-3 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors text-lg"
              title="Open in Maps"
            >
              📍
            </a>
            <button
              onClick={() => onViewDetails(tour.booking_id)}
              className="flex-1 px-3 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 border-t border-slate-200 transition-colors text-lg"
              title="View Details"
            >
              📋
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Full detail card
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Navy Header */}
      <div className="bg-[#1E3A5F] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{tour.customer_name}</h2>
            <p className="text-[#BCCCDC] mt-1 text-sm">
              {tour.party_size} guests &bull; Pickup: {formatTime(tour.pickup_time)}
            </p>
          </div>
          <div className="bg-white/10 rounded px-3 py-1.5 text-right">
            <div className="text-xs font-medium text-[#BCCCDC] uppercase tracking-wider">Booking</div>
            <div className="text-lg font-bold text-white">#{tour.booking_id}</div>
          </div>
        </div>
      </div>

      {/* Pickup / Dropoff Grid */}
      <div className="p-5 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
              📍 Pickup Location
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatTime(tour.pickup_time)}</div>
            <div className="text-slate-700 font-medium mt-1">{tour.pickup_location}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">
              🏁 Dropoff Location
            </div>
            <div className="text-slate-700 font-medium">{tour.dropoff_location}</div>
          </div>
        </div>
      </div>

      {/* Driver Notes */}
      {tour.driver_notes && (
        <div className="p-5 bg-amber-50 border-b border-amber-200">
          <div className="text-sm font-bold text-amber-700 mb-2 uppercase tracking-wider">
            ⚠️ Important Notes
          </div>
          <div className="text-base font-medium text-slate-900">{tour.driver_notes}</div>
        </div>
      )}

      {/* Stops List */}
      <div className="p-5">
        <div className="text-base font-bold mb-4 text-slate-900 uppercase tracking-wider">
          🍷 Tour Itinerary ({tour.stops?.length || 0} stops)
        </div>
        <div className="space-y-3">
          {tour.stops?.map((stop, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-lg p-4 border border-slate-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 bg-[#1E3A5F] rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{stop.winery_name}</h3>
                  <div className="text-sm font-semibold text-[#1E3A5F] mb-0.5">
                    {formatTime(stop.arrival_time)} &rarr; {formatTime(stop.departure_time)}
                    <span className="text-slate-500 font-normal ml-2">
                      ({stop.duration_minutes} min)
                    </span>
                  </div>
                  <div className="text-slate-600 text-sm">{stop.address}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row gap-3">
        <a
          href={generateMapsLink(tour)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-center transition-colors"
        >
          📍 Open in Google Maps
        </a>
        <button
          onClick={() => onViewDetails(tour.booking_id)}
          className="flex-1 py-2.5 bg-[#1E3A5F] hover:bg-[#1A3354] text-white rounded-lg font-medium text-center transition-colors"
        >
          📋 View Full Details
        </button>
      </div>
    </div>
  )
}

export default function DashboardClient({ tours, viewMode, selectedDate, driverName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const switchView = (mode: 'upcoming' | 'today') => {
    startTransition(() => {
      if (mode === 'upcoming') {
        router.push('/driver-portal/dashboard?viewMode=upcoming')
      } else {
        router.push(`/driver-portal/dashboard?viewMode=today&date=${selectedDate}`)
      }
    })
  }

  const changeDate = (newDate: string) => {
    startTransition(() => {
      router.push(`/driver-portal/dashboard?viewMode=today&date=${newDate}`)
    })
  }

  const prevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    changeDate(d.toISOString().split('T')[0])
  }

  const nextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    changeDate(d.toISOString().split('T')[0])
  }

  const goToday = () => {
    changeDate(new Date().toISOString().split('T')[0])
  }

  const handleViewDetails = (bookingId: number) => {
    router.push(`/driver-portal/tour/${bookingId}`)
  }

  const groupedTours = viewMode === 'upcoming' ? groupToursByDate(tours) : {}
  const sortedDates = Object.keys(groupedTours)
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()

  const isEmpty = viewMode === 'upcoming' ? sortedDates.length === 0 : tours.length === 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1E3A5F] p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Driver Dashboard</h1>
          <p className="text-[#BCCCDC] text-sm mt-1">
            {isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border-2 border-[#BCCCDC] border-t-transparent rounded-full animate-spin" />
                Loading...
              </span>
            ) : viewMode === 'upcoming' ? (
              `Welcome, ${driverName} — your upcoming tours (next 30 days)`
            ) : (
              `Tours for ${formatFullDate(selectedDate)}`
            )}
          </p>
        </div>
      </div>

      {/* Sticky Controls */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          {/* View Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => switchView('upcoming')}
              disabled={isPending}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                viewMode === 'upcoming'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Upcoming Tours
            </button>
            <button
              onClick={() => switchView('today')}
              disabled={isPending}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                viewMode === 'today'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              By Date
            </button>
          </div>

          {/* Date Picker (only in today mode) */}
          {viewMode === 'today' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={prevDay}
                disabled={isPending}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                ← Prev
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={e => changeDate(e.target.value)}
                disabled={isPending}
                className="flex-1 min-w-[160px] px-3 py-2 bg-white text-slate-900 rounded-lg font-medium border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />

              <button
                onClick={goToday}
                disabled={isPending}
                className="px-3 py-2 bg-[#1E3A5F] hover:bg-[#1A3354] text-white rounded-lg font-medium transition-colors"
              >
                Today
              </button>

              <button
                onClick={nextDay}
                disabled={isPending}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tours List */}
      <div className="max-w-4xl mx-auto p-6">
        {isEmpty ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
            <div className="text-6xl mb-6">🍷</div>
            <h2 className="text-2xl font-bold mb-3 text-slate-900">
              {viewMode === 'upcoming' ? 'No Upcoming Tours' : 'No Tours This Day'}
            </h2>
            <p className="text-slate-600 text-base">
              {viewMode === 'upcoming' ? (
                'You have no tours scheduled for the next 30 days.'
              ) : (
                <>
                  You have no tours scheduled for{' '}
                  <span className="font-semibold text-[#1E3A5F]">{formatFullDate(selectedDate)}</span>.
                </>
              )}
            </p>
            {viewMode === 'today' && (
              <p className="text-slate-500 mt-3 text-sm">
                Use the date picker above to check other days, or switch to Upcoming Tours.
              </p>
            )}
          </div>
        ) : viewMode === 'upcoming' ? (
          <div className="space-y-8">
            {sortedDates.map(date => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#1E3A5F] text-white px-3 py-1.5 rounded font-semibold text-sm">
                    {formatDate(date)}
                  </div>
                  <div className="text-slate-500 text-sm">{formatFullDate(date)}</div>
                  <div className="flex-1 h-px bg-slate-200" />
                  <div className="text-slate-400 text-sm">
                    {groupedTours[date].length} tour{groupedTours[date].length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="space-y-3">
                  {groupedTours[date].map(tour => (
                    <TourCard
                      key={tour.booking_id}
                      tour={tour}
                      compact={true}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-5 text-center">
              <p className="text-slate-700">
                Showing <strong>{tours.length}</strong> tour{tours.length !== 1 ? 's' : ''} across{' '}
                <strong>{sortedDates.length}</strong> day{sortedDates.length !== 1 ? 's' : ''} (next 30 days)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {tours.map(tour => (
              <TourCard
                key={tour.booking_id}
                tour={tour}
                compact={false}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
