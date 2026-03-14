import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { driverService } from '@/lib/services/driver.service'
import { prisma } from '@/lib/prisma'
import type { DriverTour } from '@/lib/services/driver.service'

// getTourById SQL returns extra fields not in the TS interface
interface TourDetail extends DriverTour {
  customer_phone?: string
  customer_email?: string
  special_requests?: string
  internal_notes?: string
  total_amount?: number
}

// ─── Helper functions ────────────────────────────────────────────────────────

function formatTime(time: string): string {
  if (!time) return ''
  const parts = time.split(':')
  const hours = parseInt(parts[0], 10)
  const minutes = parts[1] || '00'
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes} ${ampm}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Unknown Date'
  const normalized = dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00'
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return 'Invalid Date'
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function generateMapsLink(tour: DriverTour): string {
  const origin = encodeURIComponent(tour.pickup_location)
  const destination = encodeURIComponent(tour.dropoff_location)
  if (!tour.stops || tour.stops.length === 0) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
  }
  const waypoints = tour.stops.map(s => encodeURIComponent(s.address)).join('|')
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TourDetailPage({ params }: PageProps) {
  const { id } = await params

  const session = await getSession()
  if (!session || session.user.role !== 'driver') {
    redirect('/driver')
  }

  const bookingId = parseInt(id, 10)
  if (isNaN(bookingId)) {
    notFound()
  }

  const driverId = session.user.id
  const tour = await driverService.getTourById(bookingId, driverId) as TourDetail | null

  if (!tour) {
    notFound()
  }

  // Vehicle lookup (vehicle_id is returned by the SQL query but not in the TS interface)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vehicleId = (tour as any).vehicle_id as number | null | undefined
  let vehicle: { vehicle_number: string | null; make: string; model: string } | null = null
  if (vehicleId) {
    vehicle = await prisma.vehicles.findUnique({
      where: { id: vehicleId },
      select: { vehicle_number: true, make: true, model: true },
    })
  }

  const mapsLink = generateMapsLink(tour)
  const isActive = tour.status !== 'completed' && tour.status !== 'cancelled'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1E3A5F] px-4 pt-6 pb-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/driver-portal/dashboard"
            className="inline-flex items-center text-[#BCCCDC] hover:text-white text-sm font-medium mb-4 transition-colors"
          >
            ← Back
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{tour.customer_name}</h1>
              <p className="text-[#BCCCDC] mt-1 text-sm">{formatDate(tour.tour_date)}</p>
              <p className="text-[#BCCCDC] text-sm">
                {tour.party_size} {tour.party_size === 1 ? 'guest' : 'guests'}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2 text-right flex-shrink-0">
              <div className="text-[#BCCCDC] text-xs uppercase tracking-wide font-medium">Booking</div>
              <div className="text-white font-bold text-lg">#{tour.booking_id}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4 pb-8">

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col items-center gap-2 hover:border-[#1E3A5F] transition-colors"
          >
            <span className="text-2xl">📍</span>
            <span className="text-sm font-medium text-slate-700">Open Maps</span>
          </a>

          {tour.customer_phone ? (
            <a
              href={`tel:${tour.customer_phone.replace(/\D/g, '')}`}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col items-center gap-2 hover:border-[#1E3A5F] transition-colors"
            >
              <span className="text-2xl">📞</span>
              <span className="text-sm font-medium text-slate-700">Call Customer</span>
            </a>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col items-center gap-2 opacity-50">
              <span className="text-2xl">📞</span>
              <span className="text-sm font-medium text-slate-500">No Phone</span>
            </div>
          )}
        </div>

        {/* Driver Notes */}
        {tour.driver_notes && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
              Driver Notes
            </div>
            <p className="text-amber-900 text-sm leading-relaxed">{tour.driver_notes}</p>
          </div>
        )}

        {/* Special Requests */}
        {tour.special_requests && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
              Special Requests
            </div>
            <p className="text-purple-900 text-sm leading-relaxed">{tour.special_requests}</p>
          </div>
        )}

        {/* Pickup / Dropoff */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Route</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-sm font-bold">P</span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">Pickup</div>
                  <div className="text-lg font-bold text-slate-900">{formatTime(tour.pickup_time)}</div>
                  <div className="text-slate-600 text-sm mt-0.5">{tour.pickup_location}</div>
                </div>
              </div>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-slate-600 text-sm font-bold">D</span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">Dropoff</div>
                  <div className="text-slate-700 text-sm mt-0.5">{tour.dropoff_location}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Itinerary */}
        {tour.stops && tour.stops.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Itinerary — {tour.stops.length} {tour.stops.length === 1 ? 'Stop' : 'Stops'}
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {tour.stops.map((stop, index) => (
                <div key={index} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">{stop.winery_name}</h3>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1E3A5F] text-xs font-medium flex-shrink-0 hover:underline"
                        >
                          Maps
                        </a>
                      </div>
                      <div className="text-sm text-slate-600 mt-0.5">
                        {formatTime(stop.arrival_time)} – {formatTime(stop.departure_time)}
                        <span className="text-slate-400 ml-2">({stop.duration_minutes} min)</span>
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">{stop.address}</div>
                      {(stop as any).phone && (
                        <a
                          href={`tel:${(stop as any).phone.replace(/\D/g, '')}`}
                          className="text-sm text-[#1E3A5F] hover:underline mt-0.5 inline-block"
                        >
                          {(stop as any).phone}
                        </a>
                      )}
                      {(stop as any).notes && (
                        <p className="text-sm text-slate-500 mt-1 italic">{(stop as any).notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Contact */}
        {(tour.customer_phone || tour.customer_email) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Customer Contact</h2>
            </div>
            <div className="px-4 py-4 space-y-3">
              {tour.customer_phone && (
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm w-14">Phone</span>
                  <a
                    href={`tel:${tour.customer_phone.replace(/\D/g, '')}`}
                    className="text-[#1E3A5F] font-medium hover:underline"
                  >
                    {tour.customer_phone}
                  </a>
                </div>
              )}
              {tour.customer_email && (
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm w-14">Email</span>
                  <a
                    href={`mailto:${tour.customer_email}`}
                    className="text-[#1E3A5F] font-medium hover:underline truncate"
                  >
                    {tour.customer_email}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vehicle */}
        {vehicle && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Vehicle</div>
            <div className="text-slate-900 font-medium">
              {vehicle.vehicle_number} — {vehicle.make} {vehicle.model}
            </div>
          </div>
        )}

        {/* Tour Actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Tour Actions</h2>
          </div>
          <div className="px-4 py-4 grid grid-cols-2 gap-3">
            <a
              href={`/inspections/pre-trip?booking_id=${tour.booking_id}`}
              className="py-2.5 px-4 rounded-lg font-medium text-center text-white bg-[#B87333] hover:bg-[#a06628] transition-colors shadow-sm text-sm"
            >
              Pre-Trip Inspection
            </a>
            <a
              href={`/inspections/post-trip?booking_id=${tour.booking_id}`}
              className="py-2.5 px-4 rounded-lg font-medium text-center text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
            >
              Post-Trip Inspection
            </a>
          </div>
        </div>

        {/* Complete Tour */}
        {isActive && (
          <Link
            href={`/driver-portal/tour/${tour.booking_id}/complete`}
            className="block w-full py-3 px-4 rounded-xl font-semibold text-center text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
          >
            Complete Tour
          </Link>
        )}
      </div>
    </div>
  )
}
