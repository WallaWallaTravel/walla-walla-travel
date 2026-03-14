import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import DriverLoginForm from './DriverLoginForm'

export default async function DriverPage() {
  const session = await getSession()

  if (session && session.user.role === 'driver') {
    redirect('/driver-portal/dashboard')
  }

  return <DriverLoginForm />
}
