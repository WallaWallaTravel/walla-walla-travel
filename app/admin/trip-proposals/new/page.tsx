import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import CreateProposalForm from './CreateProposalForm'

export const metadata = {
  title: 'New Trip Proposal | Admin',
  description: 'Create a new trip proposal',
}

export default async function NewProposalPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <CreateProposalForm />
}
