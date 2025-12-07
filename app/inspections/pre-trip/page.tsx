import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import PreTripInspectionClient from './PreTripInspectionClient'

export default async function PreTripInspection() {
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

  return <PreTripInspectionClient driver={driver} />
}