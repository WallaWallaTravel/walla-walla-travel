import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import InspectionForm from './InspectionForm'

export const metadata = {
  title: 'Historical Inspection Entry | Admin',
  description: 'Digitize paper inspection records for compliance',
}

export default async function HistoricalInspectionPage() {
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

  return <InspectionForm drivers={drivers} vehicles={vehicles} />
}
