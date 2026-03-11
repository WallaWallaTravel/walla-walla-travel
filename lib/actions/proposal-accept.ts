'use server'

import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export type AcceptState = {
  success?: boolean
  error?: string
} | null

export async function acceptProposal(
  proposalNumber: string,
  _prevState: AcceptState,
  _formData: FormData,
): Promise<AcceptState> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const proposal = await prisma.trip_proposals.findUnique({
    where: { proposal_number: proposalNumber },
    select: { id: true, status: true, valid_until: true },
  })

  if (!proposal) {
    return { error: 'Proposal not found' }
  }

  if (!['sent', 'viewed'].includes(proposal.status || '')) {
    return { error: 'This proposal cannot be accepted at this time' }
  }

  if (proposal.valid_until && new Date(proposal.valid_until) < new Date()) {
    return { error: 'This proposal has expired. Please contact us for an updated proposal.' }
  }

  await prisma.$transaction([
    prisma.trip_proposals.update({
      where: { id: proposal.id },
      data: {
        status: 'accepted',
        accepted_at: new Date(),
        accepted_ip: ip,
      },
    }),
    prisma.trip_proposal_activity.create({
      data: {
        trip_proposal_id: proposal.id,
        action: 'accepted',
        description: 'Client accepted the proposal',
        actor_type: 'client',
        ip_address: ip,
      },
    }),
  ])

  revalidatePath(`/trip-proposals/${proposalNumber}`)
  return { success: true }
}
