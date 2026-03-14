import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { sharedTourService } from '@/lib/services/shared-tour.service'
import { prisma } from '@/lib/prisma'
import SharedToursClient from './SharedToursClient'

export const metadata = {
  title: 'Shared Tours | Admin',
}

export default async function SharedToursPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [tours, presetsRaw, vehiclesRaw] = await Promise.all([
    sharedTourService.getUpcomingTours(),
    prisma.$queryRaw<Array<{
      id: number
      name: string
      start_time: string
      duration_hours: number
      base_price_per_person: number
      lunch_price_per_person: number
      title: string | null
      description: string | null
      max_guests: number
      min_guests: number
      is_default: boolean
      sort_order: number
    }>>`
      SELECT id, name, start_time::text, duration_hours::float,
             base_price_per_person::float, lunch_price_per_person::float,
             title, description, max_guests, min_guests, is_default, sort_order
      FROM shared_tour_presets
      ORDER BY sort_order ASC, name ASC
    `,
    prisma.$queryRaw<Array<{ id: number; name: string }>>`
      SELECT id, CONCAT(make, ' ', model) as name
      FROM vehicles
      ORDER BY id
    `,
  ])

  const vehicleMap: Record<number, string> = {}
  for (const v of vehiclesRaw) {
    vehicleMap[v.id] = v.name
  }

  return (
    <SharedToursClient
      initialTours={tours}
      initialPresets={presetsRaw}
      initialVehicleMap={vehicleMap}
    />
  )
}
