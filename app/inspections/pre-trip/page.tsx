import { redirect } from 'next/navigation'
import { requireAuth, getUser } from '@/lib/auth'
import PreTripInspectionClient from './PreTripInspectionClient'

export default async function PreTripInspection() {
  const session = await requireAuth()
  const driver = await getUser()
  
  if (!session || !driver) {
    redirect('/login')
  }

  return <PreTripInspectionClient driver={driver} />
}