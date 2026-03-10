import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import BookingDetail, {
  type BookingData,
  type PaymentRow,
  type TimelineEntry,
} from './BookingDetail'

export const metadata = {
  title: 'Booking Detail | Admin',
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const bookingId = parseInt(id, 10)
  if (isNaN(bookingId)) {
    return <NotFound />
  }

  // Fetch booking with driver + vehicle names (no Prisma relations)
  const rows = await prisma.$queryRaw<
    Array<{
      id: number
      booking_number: string
      customer_name: string
      customer_email: string
      customer_phone: string | null
      customer_id: number | null
      party_size: number
      tour_date: Date
      start_time: string | null
      end_time: string | null
      duration_hours: number | null
      pickup_location: string | null
      dropoff_location: string | null
      special_requests: string | null
      wine_tour_preference: string | null
      tour_type: string | null
      status: string
      driver_id: number | null
      driver_name: string | null
      vehicle_id: number | null
      vehicle_name: string | null
      hourly_rate: number | null
      estimated_hours: number | null
      base_price: number | null
      taxes: number | null
      gratuity: number | null
      total_price: number | null
      deposit_amount: number | null
      deposit_paid: boolean | null
      final_payment_amount: number | null
      final_payment_paid: boolean | null
      created_at: Date
    }>
  >`
    SELECT
      b.id, b.booking_number, b.customer_name, b.customer_email,
      b.customer_phone, b.customer_id, b.party_size, b.tour_date,
      b.start_time::text as start_time, b.end_time::text as end_time,
      b.duration_hours::float as duration_hours,
      b.pickup_location, b.dropoff_location, b.special_requests,
      b.wine_tour_preference, b.tour_type, b.status,
      b.driver_id, u.name as driver_name,
      b.vehicle_id, v.name as vehicle_name,
      b.hourly_rate::float as hourly_rate,
      b.estimated_hours::float as estimated_hours,
      b.base_price::float as base_price,
      b.taxes::float as taxes,
      b.gratuity::float as gratuity,
      b.total_price::float as total_price,
      b.deposit_amount::float as deposit_amount,
      b.deposit_paid,
      b.final_payment_amount::float as final_payment_amount,
      b.final_payment_paid,
      b.created_at
    FROM bookings b
    LEFT JOIN users u ON b.driver_id = u.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.id = ${bookingId}
    LIMIT 1
  `

  if (rows.length === 0) {
    return <NotFound />
  }

  const raw = rows[0]
  const booking: BookingData = {
    ...raw,
    tour_date: raw.tour_date.toISOString().split('T')[0],
    deposit_paid: raw.deposit_paid ?? false,
    final_payment_paid: raw.final_payment_paid ?? false,
    created_at: raw.created_at.toISOString(),
  }

  // Payments for this booking
  const paymentsRaw = await prisma.payments.findMany({
    where: { booking_id: bookingId, status: 'succeeded' },
    select: {
      id: true,
      amount: true,
      payment_type: true,
      payment_method: true,
      status: true,
      card_last4: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  })

  const payments: PaymentRow[] = paymentsRaw.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    payment_type: p.payment_type,
    payment_method: p.payment_method,
    status: p.status,
    card_last4: p.card_last4,
    created_at: p.created_at.toISOString(),
  }))

  // Timeline / notes (@@ignore model)
  let timeline: TimelineEntry[] = []
  try {
    const timelineRaw = await prisma.$queryRaw<
      Array<{
        id: number
        event_type: string
        event_description: string | null
        created_by_name: string | null
        created_at: Date
      }>
    >`
      SELECT bt.id, bt.event_type, bt.event_description,
             u.name as created_by_name, bt.created_at
      FROM booking_timeline bt
      LEFT JOIN users u ON bt.created_by = u.id
      WHERE bt.booking_id = ${bookingId}
      ORDER BY bt.created_at DESC
      LIMIT 50
    `

    timeline = timelineRaw.map((t) => ({
      id: t.id,
      event_type: t.event_type,
      event_description: t.event_description,
      created_by_name: t.created_by_name,
      created_at: t.created_at.toISOString(),
    }))
  } catch {
    // booking_timeline table may not exist
  }

  // Active drivers for dropdown
  const driversRaw = await prisma.users.findMany({
    where: { role: 'driver', is_active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // Active vehicles for dropdown
  const vehiclesRaw = await prisma.vehicles.findMany({
    where: { is_active: true },
    select: { id: true, name: true, capacity: true },
    orderBy: { name: 'asc' },
  })

  return (
    <BookingDetail
      booking={booking}
      payments={payments}
      timeline={timeline}
      drivers={driversRaw}
      vehicles={vehiclesRaw}
    />
  )
}

function NotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Booking not found
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        This booking may have been deleted or the ID is incorrect.
      </p>
      <Link
        href="/admin/bookings"
        className="text-indigo-600 font-medium hover:underline"
      >
        Back to Bookings
      </Link>
    </div>
  )
}
