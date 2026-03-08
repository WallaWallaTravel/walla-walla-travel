import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import PreTripInspectionClient from './PreTripInspectionClient'

export default async function PreTripInspection() {
  const session = await auth()
  
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