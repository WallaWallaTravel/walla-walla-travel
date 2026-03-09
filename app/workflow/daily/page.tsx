import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import DailyWorkflowClient from './DailyWorkflowClient'

export default async function DailyWorkflow() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  return <DailyWorkflowClient userEmail={session.user.email} />
}