import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { getCalendarData } from '@/lib/actions/calendar'
import CalendarView from './CalendarView'

export const metadata = {
  title: 'Calendar | Admin',
  description: 'Admin booking calendar',
}

export default async function CalendarPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const now = new Date()
  const initialYear = now.getFullYear()
  const initialMonth = now.getMonth() + 1

  const data = await getCalendarData(initialYear, initialMonth)

  return (
    <CalendarView
      initialData={data}
      initialYear={initialYear}
      initialMonth={initialMonth}
    />
  )
}
