import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DriversList, { type DriverRow } from './DriversList'

export const metadata = {
  title: 'Drivers | Admin',
  description: 'View and manage drivers and compliance status',
}

export default async function DriversPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Fetch all drivers
  const driversRaw = await prisma.users.findMany({
    where: { role: 'driver' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      is_active: true,
      license_number: true,
      license_expiry: true,
      medical_cert_expiry: true,
      dq_file_complete: true,
    },
  })

  const driverIds = driversRaw.map((d) => d.id)

  // Fetch related data separately (no Prisma relations defined)
  const [allDocs, recentTimeCards] = await Promise.all([
    prisma.driver_documents.findMany({
      where: { driver_id: { in: driverIds }, is_active: true },
      select: { driver_id: true, expiry_date: true },
    }),
    prisma.$queryRaw<{ driver_id: number; clock_in_time: Date }[]>`
      SELECT DISTINCT ON (driver_id) driver_id, clock_in_time
      FROM time_cards
      WHERE driver_id = ANY(${driverIds}::int[])
      ORDER BY driver_id, clock_in_time DESC
    `,
  ])

  // Build lookup maps
  const docsByDriver = new Map<number, typeof allDocs>()
  for (const doc of allDocs) {
    const existing = docsByDriver.get(doc.driver_id) || []
    existing.push(doc)
    docsByDriver.set(doc.driver_id, existing)
  }

  const lastClockInByDriver = new Map<number, Date>()
  for (const tc of recentTimeCards) {
    if (tc.clock_in_time) lastClockInByDriver.set(tc.driver_id, tc.clock_in_time)
  }

  // Calculate stats
  const totalDrivers = driversRaw.length
  const activeDrivers = driversRaw.filter((d) => d.is_active).length
  const expiringDocs = allDocs.filter((doc) => {
    if (!doc.expiry_date) return false
    const expiry = new Date(doc.expiry_date)
    return expiry > now && expiry <= thirtyDaysFromNow
  }).length
  const missingDqFile = driversRaw.filter((d) => !d.dq_file_complete).length

  // Map to serializable rows
  const drivers: DriverRow[] = driversRaw.map((d) => {
    const lastClockIn = lastClockInByDriver.get(d.id)
    return {
      id: d.id,
      name: d.name || 'Unnamed',
      is_active: d.is_active ?? false,
      license_number: d.license_number,
      license_expiry: d.license_expiry ? d.license_expiry.toISOString().split('T')[0] : null,
      medical_cert_expiry: d.medical_cert_expiry ? d.medical_cert_expiry.toISOString().split('T')[0] : null,
      dq_file_complete: d.dq_file_complete ?? false,
      last_clock_in: lastClockIn ? lastClockIn.toISOString() : null,
    }
  })

  return (
    <DriversList
      drivers={drivers}
      stats={{
        totalDrivers,
        activeDrivers,
        expiringDocs,
        missingDqFile,
      }}
    />
  )
}
