import { driverService } from '@/lib/services/driver.service'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import type { DriverTour } from '@/lib/services/driver.service'

export default async function DriverDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ viewMode?: string; date?: string }>
}) {
  const params = await searchParams
  const viewMode = params.viewMode === 'today' ? 'today' : 'upcoming'
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = params.date || today

  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const driverId = session.user.id

  let tours: DriverTour[] = []
  if (viewMode === 'upcoming') {
    tours = await driverService.getUpcomingTours(driverId, 30, 50)
  } else {
    tours = await driverService.getToursByDate(driverId, selectedDate)
  }

  return (
    <DashboardClient
      tours={tours}
      viewMode={viewMode}
      selectedDate={selectedDate}
      driverName={session.user.name}
    />
  )
}
