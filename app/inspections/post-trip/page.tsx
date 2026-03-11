import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { PostTripInspectionClient } from './PostTripInspectionClient'
import { prisma } from '@/lib/prisma'
import { formatDateForDB } from '@/app/api/utils'
import { logger } from '@/lib/logger'

export default async function PostTripInspection() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Format driver data for the client component
  const driver = {
    id: session.user.id.toString(),
    name: session.user.name,
    email: session.user.email,
  }

  // Get actual beginning mileage from today's pre-trip inspection
  let beginningMileage = 0
  try {
    const today = formatDateForDB(new Date())
    const rows = await prisma.$queryRaw<{ start_mileage: number | null }[]>`
      SELECT start_mileage
      FROM inspections
      WHERE driver_id = ${driver.id}
        AND type = 'pre_trip'
        AND DATE(created_at) = ${today}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (rows.length > 0) {
      beginningMileage = rows[0].start_mileage || 0
    }
  } catch (error) {
    logger.error('Failed to fetch beginning mileage', { error })
  }

  return <PostTripInspectionClient driver={driver} beginningMileage={beginningMileage} />
}
