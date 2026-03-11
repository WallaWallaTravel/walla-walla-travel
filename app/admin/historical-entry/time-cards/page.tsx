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

  // Load drivers and vehicles via Prisma
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

  // Load bookings separately — wrapped in try/catch so the page still renders if this fails
  let bookingsRaw: { id: number; booking_number: string; customer_name: string; tour_date: Date | null }[] = []
  try {
    bookingsRaw = await prisma.bookings.findMany({
      where: { status: 'completed' },
      orderBy: { tour_date: 'desc' },
      take: 100,
      select: {
        id: true,
        booking_number: true,
        customer_name: true,
        tour_date: true,
      },
    })
  } catch (err) {
    console.error('Failed to load bookings for historical time cards:', err)
  }

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

  const bookings = bookingsRaw.map((b) => {
    let tourDate = ''
    try {
      tourDate = b.tour_date ? new Date(b.tour_date).toISOString().split('T')[0] : ''
    } catch {
      tourDate = ''
    }
    return {
      id: b.id,
      booking_number: b.booking_number || '',
      customer_name: b.customer_name || '',
      tour_date: tourDate,
    }
  })

  return <TimeCardForm drivers={drivers} vehicles={vehicles} bookings={bookings} />
}
