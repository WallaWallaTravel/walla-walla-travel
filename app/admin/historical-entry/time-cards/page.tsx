import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import TimeCardForm from './TimeCardForm'

export const metadata = {
  title: 'Historical Time Card Entry | Admin',
  description: 'Digitize paper time sheets and driver work records',
}

export default async function HistoricalTimeCardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Load drivers and vehicles via Prisma (same as inspections page — which works)
  const [driversRaw, vehiclesRaw] = await Promise.all([
    prisma.users.findMany({
      where: { role: 'driver' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.vehicles.findMany({
      where: { is_active: true },
      orderBy: { vehicle_number: 'asc' },
      select: { id: true, vehicle_number: true, make: true, model: true },
    }),
  ])

  const drivers = driversRaw.map((d) => ({
    id: d.id,
    name: d.name || 'Unnamed',
  }))

  const vehicles = vehiclesRaw.map((v) => ({
    id: v.id,
    vehicle_number: v.vehicle_number || `#${v.id}`,
    make: v.make,
    model: v.model,
  }))

  // Load bookings via raw SQL to avoid any Prisma serialization issues
  // (the Prisma findMany on bookings was causing Server Components render crash)
  let bookings: { id: number; booking_number: string; customer_name: string; tour_date: string }[] = []
  try {
    const rows = await prisma.$queryRaw<
      { id: number; booking_number: string; customer_name: string; tour_date: string | null }[]
    >`
      SELECT id, booking_number, customer_name, tour_date::text
      FROM bookings
      WHERE status = 'completed'
      ORDER BY tour_date DESC
      LIMIT 100
    `
    bookings = rows.map((r) => ({
      id: Number(r.id),
      booking_number: r.booking_number || '',
      customer_name: r.customer_name || '',
      tour_date: r.tour_date || '',
    }))
  } catch (err) {
    console.error('Failed to load bookings for historical time cards:', err)
  }

  return <TimeCardForm drivers={drivers} vehicles={vehicles} bookings={bookings} />
}
