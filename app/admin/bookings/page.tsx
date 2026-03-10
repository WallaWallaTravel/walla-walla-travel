import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import BookingsList, { type BookingRow } from './BookingsList'

export const metadata = {
  title: 'Bookings | Admin',
  description: 'View and manage all bookings',
}

export default async function BookingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Bookings with driver + vehicle names via JOIN
  // (bookings has no Prisma relation to users/vehicles)
  const bookingsRaw = await prisma.$queryRaw<
    Array<{
      id: number
      booking_number: string
      customer_name: string
      tour_date: Date
      start_time: string | null
      party_size: number
      status: string
      driver_name: string | null
      vehicle_name: string | null
      total_price: number | null
    }>
  >`
    SELECT
      b.id,
      b.booking_number,
      b.customer_name,
      b.tour_date,
      b.start_time::text as start_time,
      b.party_size,
      b.status,
      u.name as driver_name,
      v.name as vehicle_name,
      b.total_price::float as total_price
    FROM bookings b
    LEFT JOIN users u ON b.driver_id = u.id
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    ORDER BY b.created_at DESC
    LIMIT 100
  `

  const bookings: BookingRow[] = bookingsRaw.map((b) => ({
    id: b.id,
    booking_number: b.booking_number,
    customer_name: b.customer_name,
    tour_date: b.tour_date.toISOString().split('T')[0],
    start_time: b.start_time,
    party_size: b.party_size,
    status: b.status,
    driver_name: b.driver_name,
    vehicle_name: b.vehicle_name,
    total_price: b.total_price,
  }))

  return <BookingsList bookings={bookings} />
}
