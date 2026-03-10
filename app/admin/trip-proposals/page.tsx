import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProposalsList, { type ProposalRow } from './ProposalsList'

export const metadata = {
  title: 'Trip Proposals | Admin',
  description: 'View and manage trip proposals',
}

export default async function ProposalsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const proposalsRaw = await prisma.trip_proposals.findMany({
    orderBy: { created_at: 'desc' },
    take: 100,
    select: {
      id: true,
      proposal_number: true,
      customer_name: true,
      trip_type: true,
      start_date: true,
      end_date: true,
      party_size: true,
      total: true,
      status: true,
      created_at: true,
    },
  })

  const proposals: ProposalRow[] = proposalsRaw.map((p) => ({
    id: p.id,
    proposal_number: p.proposal_number,
    customer_name: p.customer_name,
    trip_type: p.trip_type,
    start_date: p.start_date.toISOString().split('T')[0],
    end_date: p.end_date ? p.end_date.toISOString().split('T')[0] : null,
    party_size: p.party_size,
    total: p.total ? Number(p.total) : null,
    status: p.status,
    created_at: p.created_at ? p.created_at.toISOString() : null,
  }))

  return <ProposalsList proposals={proposals} />
}
