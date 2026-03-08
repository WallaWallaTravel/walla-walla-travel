import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import DailyWorkflowClient from './DailyWorkflowClient'

export default async function DailyWorkflow() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  return <DailyWorkflowClient userEmail={session.user.email} />
}