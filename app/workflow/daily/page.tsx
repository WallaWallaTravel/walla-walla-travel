import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import DailyWorkflowClient from './DailyWorkflowClient'

export default async function DailyWorkflow() {
  const session = await requireAuth()
  
  if (!session || !session.user) {
    redirect('/login')
  }

  return <DailyWorkflowClient userEmail={session.user.email || ''} />
}