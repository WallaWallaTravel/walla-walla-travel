'use server'

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ProposalQueryResult<T = Record<string, unknown>> = {
  success: boolean
  data?: T
  error?: string
}

export type ProposalForAcceptance = {
  proposal_number: string
  status: string | null
  brand_id: number | null
  customer_name: string
  total: string
  deposit_amount: string
  deposit_percentage: number
  valid_until: string | null
}

export type ProposalPaymentStatus = {
  id: number
  proposal_number: string
  status: string | null
  customer_name: string
  customer_email: string | null
  trip_type: string | null
  start_date: string
  end_date: string | null
  party_size: number
  total: string
  deposit_amount: string
  deposit_paid: boolean
  deposit_paid_at: string | null
  brand_id: number | null
}

// -----------------------------------------------------------------------------
// getProposalForAcceptance — public query with limited fields
// No auth required (client-facing acceptance page)
// -----------------------------------------------------------------------------

export async function getProposalForAcceptance(
  proposalNumber: string
): Promise<ProposalQueryResult<ProposalForAcceptance>> {
  if (!proposalNumber || !proposalNumber.startsWith('TP-')) {
    return { success: false, error: 'Invalid proposal number' }
  }

  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { proposal_number: proposalNumber },
      select: {
        proposal_number: true,
        status: true,
        brand_id: true,
        customer_name: true,
        total: true,
        deposit_amount: true,
        deposit_percentage: true,
        valid_until: true,
      },
    })

    if (!proposal) {
      return { success: false, error: 'Proposal not found' }
    }

    return {
      success: true,
      data: {
        proposal_number: proposal.proposal_number,
        status: proposal.status,
        brand_id: proposal.brand_id,
        customer_name: proposal.customer_name,
        total: proposal.total?.toString() ?? '0',
        deposit_amount: proposal.deposit_amount?.toString() ?? '0',
        deposit_percentage: proposal.deposit_percentage ?? 50,
        valid_until: proposal.valid_until?.toISOString().split('T')[0] ?? null,
      },
    }
  } catch (error) {
    logger.error('Failed to get proposal for acceptance', {
      error,
      proposalNumber,
    })
    return {
      success: false,
      error: 'Failed to load proposal',
    }
  }
}

// -----------------------------------------------------------------------------
// getProposalPaymentStatus — payment state for client view
// No auth required (client-facing payment page)
// -----------------------------------------------------------------------------

export async function getProposalPaymentStatus(
  proposalNumber: string
): Promise<ProposalQueryResult<ProposalPaymentStatus>> {
  if (!proposalNumber || !proposalNumber.startsWith('TP-')) {
    return { success: false, error: 'Invalid proposal number' }
  }

  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { proposal_number: proposalNumber },
      select: {
        id: true,
        proposal_number: true,
        status: true,
        customer_name: true,
        customer_email: true,
        trip_type: true,
        start_date: true,
        end_date: true,
        party_size: true,
        total: true,
        deposit_amount: true,
        deposit_paid: true,
        deposit_paid_at: true,
        brand_id: true,
      },
    })

    if (!proposal) {
      return { success: false, error: 'Proposal not found' }
    }

    return {
      success: true,
      data: {
        id: proposal.id,
        proposal_number: proposal.proposal_number,
        status: proposal.status,
        customer_name: proposal.customer_name,
        customer_email: proposal.customer_email,
        trip_type: proposal.trip_type,
        start_date: proposal.start_date.toISOString().split('T')[0],
        end_date: proposal.end_date?.toISOString().split('T')[0] ?? null,
        party_size: proposal.party_size,
        total: proposal.total?.toString() ?? '0',
        deposit_amount: proposal.deposit_amount?.toString() ?? '0',
        deposit_paid: proposal.deposit_paid ?? false,
        deposit_paid_at: proposal.deposit_paid_at?.toISOString() ?? null,
        brand_id: proposal.brand_id,
      },
    }
  } catch (error) {
    logger.error('Failed to get proposal payment status', {
      error,
      proposalNumber,
    })
    return {
      success: false,
      error: 'Failed to load proposal payment status',
    }
  }
}
