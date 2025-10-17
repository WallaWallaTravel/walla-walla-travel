import { redirect } from 'next/navigation'
import { requireAuth, getUser } from '@/lib/auth'
import { PostTripInspectionClient } from './PostTripInspectionClient'
import { query } from '@/lib/db'
import { formatDateForDB } from '@/app/api/utils'

export default async function PostTripInspection() {
  const session = await requireAuth()
  const driver = await getUser()
  
  if (!session || !driver) {
    redirect('/login')
  }

  // Get actual beginning mileage from today's pre-trip inspection
  let beginningMileage = 0
  try {
    const today = formatDateForDB(new Date())
    const preTripResult = await query(`
      SELECT start_mileage 
      FROM inspections 
      WHERE driver_id = $1 
        AND type = 'pre_trip'
        AND DATE(created_at) = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [driver.id, today])
    
    if (preTripResult.rows.length > 0) {
      beginningMileage = preTripResult.rows[0].start_mileage || 0
    }
  } catch (error) {
    console.error('Failed to fetch beginning mileage:', error)
  }

  return <PostTripInspectionClient driver={driver} beginningMileage={beginningMileage} />
}