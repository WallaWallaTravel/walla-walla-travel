import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { BookingConsole } from './BookingConsole'

export default async function QuickCreateBookingPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <BookingConsole />
}
