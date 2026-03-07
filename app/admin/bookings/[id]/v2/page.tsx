/**
 * Booking Detail Page (V2 — Prisma + Server Actions)
 *
 * Migrated version using:
 * - Server Actions for data fetching (getBookingById, getDrivers, getVehicles)
 * - Server Actions for mutations (updateBookingStatus, assignDriver)
 * - React Hook Form + Zod for assignment form
 *
 * The original page at /admin/bookings/[id] remains untouched.
 * This page is accessible at /admin/bookings/[id]/v2.
 */

import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getBookingById, getDrivers, getVehicles } from '@/lib/actions/booking-queries'
import { BookingActionsV2 } from '../BookingActionsV2'
import { BookingAssignmentV2 } from '../BookingAssignmentV2'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const hours = d.getUTCHours()
  const minutes = d.getUTCMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'in_progress':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'assigned':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getDaysUntil(dateStr: string): {
  days: number
  label: string
  urgent: boolean
} {
  const tourDate = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  tourDate.setHours(0, 0, 0, 0)

  const diffTime = tourDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0)
    return { days: diffDays, label: `${Math.abs(diffDays)} days ago`, urgent: false }
  if (diffDays === 0) return { days: 0, label: 'TODAY', urgent: true }
  if (diffDays === 1) return { days: 1, label: 'Tomorrow', urgent: true }
  if (diffDays <= 3)
    return { days: diffDays, label: `In ${diffDays} days`, urgent: true }
  return { days: diffDays, label: `In ${diffDays} days`, urgent: false }
}

export default async function BookingDetailPageV2({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Auth check via Auth.js
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/login')
  }

  // Fetch data via Server Actions (Prisma)
  const [bookingResult, driversResult, vehiclesResult] = await Promise.all([
    getBookingById(parseInt(id)),
    getDrivers(),
    getVehicles(),
  ])

  if (!bookingResult.success || !bookingResult.booking) {
    notFound()
  }

  const booking = bookingResult.booking
  const drivers = driversResult.drivers || []
  const vehicles = vehiclesResult.vehicles || []
  const daysUntil = getDaysUntil(booking.tour_date)

  // Calculate payment status
  const depositAmount = booking.deposit_amount || 0
  const finalAmount = booking.final_payment_amount || 0
  const totalPaid =
    (booking.deposit_paid ? depositAmount : 0) +
    (booking.final_payment_paid ? finalAmount : 0)
  const totalDue = booking.total_price || 0
  const paymentStatus =
    totalPaid >= totalDue && totalDue > 0
      ? 'Paid in Full'
      : booking.deposit_paid
        ? 'Deposit Paid'
        : 'Awaiting Payment'

  // Identify issues
  const issues: string[] = []
  if (!booking.driver_id && daysUntil.days <= 7 && daysUntil.days >= 0) {
    issues.push('No driver assigned')
  }
  if (!booking.deposit_paid && daysUntil.days <= 14 && daysUntil.days >= 0) {
    issues.push('Deposit not received')
  }
  if (
    !booking.final_payment_paid &&
    daysUntil.days <= 3 &&
    daysUntil.days >= 0
  ) {
    issues.push('Final payment pending')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/bookings"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block"
        >
          &larr; Back to Trips
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Booking #{booking.booking_number}
            </h1>
            <p className="text-gray-600 mt-1">
              Created {new Date(booking.created_at).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              V2 — Prisma + Server Actions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(booking.status)}`}
            >
              {booking.status.toUpperCase()}
            </span>
            {daysUntil.urgent &&
              booking.status !== 'completed' &&
              booking.status !== 'cancelled' && (
                <span className="px-4 py-2 rounded-full text-sm font-semibold bg-red-600 text-white">
                  {daysUntil.label}
                </span>
              )}
          </div>
        </div>
      </div>

      {/* Issues Alert */}
      {issues.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-2">Action Required</h3>
          <ul className="list-disc list-inside text-amber-700 space-y-1">
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tour Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Tour Details
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Tour Date
                </label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatDate(booking.tour_date)}
                </p>
                <p
                  className={`text-sm mt-1 ${daysUntil.urgent ? 'text-red-600 font-semibold' : 'text-gray-500'}`}
                >
                  {daysUntil.label}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Time
                </label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatTime(booking.start_time)}
                  {booking.end_time ? ` - ${formatTime(booking.end_time)}` : ''}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {booking.duration_hours} hour tour
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Party Size
                </label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {booking.party_size} guests
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Source
                </label>
                <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                  {booking.booking_source || 'Website'}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Pickup Location
                  </label>
                  <p className="text-gray-900 mt-1">
                    {booking.pickup_location || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Dropoff Location
                  </label>
                  <p className="text-gray-900 mt-1">
                    {booking.dropoff_location || 'Same as pickup'}
                  </p>
                </div>
              </div>
            </div>

            {booking.special_requests && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="text-sm font-medium text-gray-500">
                  Special Requests
                </label>
                <p className="text-gray-900 mt-1 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  {booking.special_requests}
                </p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Customer Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Name
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  {booking.customer_name}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Email
                  </label>
                  <p className="text-gray-900">
                    <a
                      href={`mailto:${booking.customer_email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {booking.customer_email}
                    </a>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Phone
                  </label>
                  <p className="text-gray-900">
                    <a
                      href={`tel:${booking.customer_phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {booking.customer_phone || 'Not provided'}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment — V2 with React Hook Form + Server Actions */}
          <BookingAssignmentV2
            bookingId={booking.id}
            currentDriverId={booking.driver_id}
            currentDriverName={booking.driver_name}
            currentVehicleId={booking.vehicle_id}
            currentVehicleNumber={booking.vehicle_number}
            drivers={drivers}
            vehicles={vehicles}
          />
        </div>

        {/* Sidebar - Right column */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment</h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Price</span>
                <span className="font-medium">
                  ${(booking.base_price || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-lg">
                  ${(booking.total_price || 0).toFixed(2)}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">
                    Deposit (${depositAmount.toFixed(2)})
                  </span>
                  {booking.deposit_paid ? (
                    <span className="text-green-600 font-medium">Paid</span>
                  ) : (
                    <span className="text-red-600 font-medium">Pending</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    Final (${finalAmount.toFixed(2)})
                  </span>
                  {booking.final_payment_paid ? (
                    <span className="text-green-600 font-medium">Paid</span>
                  ) : (
                    <span className="text-red-600 font-medium">Pending</span>
                  )}
                </div>
              </div>

              <div
                className={`mt-4 p-3 rounded-lg text-center font-semibold ${
                  paymentStatus === 'Paid in Full'
                    ? 'bg-green-100 text-green-800'
                    : paymentStatus === 'Deposit Paid'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {paymentStatus}
              </div>
            </div>
          </div>

          {/* Quick Actions — V2 with Server Actions */}
          <BookingActionsV2
            bookingId={booking.id}
            bookingNumber={booking.booking_number}
            status={booking.status}
            customerEmail={booking.customer_email}
          />

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Activity</h2>

            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Booking Created</p>
                  <p className="text-gray-500">
                    {new Date(booking.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {booking.deposit_paid && booking.deposit_paid_at && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Deposit Received
                    </p>
                    <p className="text-gray-500">
                      {new Date(booking.deposit_paid_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {booking.driver_id && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></div>
                  <div>
                    <p className="font-medium text-gray-900">Driver Assigned</p>
                    <p className="text-gray-500">{booking.driver_name}</p>
                  </div>
                </div>
              )}
              {booking.completed_at && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></div>
                  <div>
                    <p className="font-medium text-gray-900">Tour Completed</p>
                    <p className="text-gray-500">
                      {new Date(booking.completed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {booking.cancelled_at && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Booking Cancelled
                    </p>
                    <p className="text-gray-500">
                      {new Date(booking.cancelled_at).toLocaleString()}
                    </p>
                    {booking.cancellation_reason && (
                      <p className="text-gray-500 italic mt-1">
                        &quot;{booking.cancellation_reason}&quot;
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
