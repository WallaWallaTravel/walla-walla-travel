import { PostTripInspectionClient } from './PostTripInspectionClient'
import { getCurrentUser } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function PostTripInspection() {
  // Get current user session
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  // TODO: Get actual beginning mileage from today's pre-trip inspection
  const beginningMileage = 50000

  return <PostTripInspectionClient driver={user} beginningMileage={beginningMileage} />
}