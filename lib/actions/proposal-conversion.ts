'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { AcceptProposalSchema, type AcceptProposalInput } from '@/lib/schemas/proposal-conversion'
import { generateSecureString } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { Prisma } from '@/lib/generated/prisma/client'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ProposalConversionResult = {
  success: boolean
  data?: Record<string, unknown>
  error?: string | Record<string, string[]>
}

// -----------------------------------------------------------------------------
// acceptProposal — mark proposal accepted with signature (public, no auth)
// -----------------------------------------------------------------------------

export async function acceptProposal(
  proposalNumber: string,
  data: AcceptProposalInput,
  meta?: { ipAddress?: string }
): Promise<ProposalConversionResult> {
  // Validate input
  const parsed = AcceptProposalSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  if (!proposalNumber || !proposalNumber.startsWith('TP-')) {
    return { success: false, error: 'Invalid proposal number' }
  }

  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { proposal_number: proposalNumber },
      select: {
        id: true,
        status: true,
        valid_until: true,
        proposal_number: true,
        deposit_amount: true,
        total: true,
      },
    })

    if (!proposal) {
      return { success: false, error: 'Proposal not found' }
    }

    // Only allow accepting sent or viewed proposals
    if (!['sent', 'viewed'].includes(proposal.status ?? '')) {
      return {
        success: false,
        error:
          proposal.status === 'accepted'
            ? 'This proposal has already been accepted'
            : 'This proposal cannot be accepted',
      }
    }

    // Check validity
    if (proposal.valid_until) {
      const validUntil = new Date(proposal.valid_until)
      if (validUntil < new Date()) {
        // Mark as expired
        await prisma.trip_proposals.update({
          where: { id: proposal.id },
          data: { status: 'expired', updated_at: new Date() },
        })
        return { success: false, error: 'This proposal has expired' }
      }
    }

    // Accept the proposal
    const now = new Date()
    const updated = await prisma.trip_proposals.update({
      where: { id: proposal.id },
      data: {
        status: 'accepted',
        accepted_at: now,
        accepted_signature: parsed.data.signature,
        accepted_ip: meta?.ipAddress ?? 'unknown',
        updated_at: now,
      },
    })

    // Log activity
    await prisma.trip_proposal_activity.create({
      data: {
        trip_proposal_id: proposal.id,
        action: 'accepted',
        description: 'Proposal accepted by customer',
        actor_type: 'customer',
        ip_address: meta?.ipAddress ?? 'unknown',
        metadata: {},
      },
    })

    return {
      success: true,
      data: {
        proposal_number: updated.proposal_number,
        status: updated.status,
        accepted_at: updated.accepted_at?.toISOString() ?? null,
        deposit_amount: updated.deposit_amount?.toString() ?? '0',
        total: updated.total?.toString() ?? '0',
      },
    }
  } catch (error) {
    logger.error('Failed to accept proposal', { error, proposalNumber })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept proposal',
    }
  }
}

// -----------------------------------------------------------------------------
// convertToBooking — Prisma-based conversion (replaces raw SQL)
// Must be called by admin staff.
// -----------------------------------------------------------------------------

export async function convertToBooking(
  proposalId: number
): Promise<ProposalConversionResult> {
  // Auth check — only admin can convert
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const userId = session.user.id ? session.user.id : undefined

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Read proposal with all inclusions
      const proposal = await tx.trip_proposals.findUnique({
        where: { id: proposalId },
        include: {
          trip_proposal_inclusions: true,
          trip_proposal_days: true,
        },
      })

      if (!proposal) {
        throw new Error('Proposal not found')
      }

      if (proposal.status !== 'accepted') {
        throw new Error('Only accepted proposals can be converted to bookings')
      }

      if (proposal.converted_to_booking_id) {
        throw new Error('This proposal has already been converted to a booking')
      }

      // 2. Calculate duration from days
      const numDays = proposal.trip_proposal_days?.length || 1
      const durationHours = numDays * 6

      // 3. Generate booking number using timestamp + random (matching existing pattern)
      const prefix = 'WWT'
      const year = new Date().getFullYear()
      const timestamp = Date.now().toString().slice(-6)
      const random = generateSecureString(3, '0123456789')
      const bookingNumber = `${prefix}-${year}-${timestamp}${random}`

      // 4. Create booking record via Prisma
      const booking = await tx.bookings.create({
        data: {
          booking_number: bookingNumber,
          customer_name: proposal.customer_name,
          customer_email: proposal.customer_email ?? '',
          customer_phone: proposal.customer_phone,
          customer_id: proposal.customer_id,
          party_size: proposal.party_size,
          tour_date: proposal.start_date,
          start_time: new Date('1970-01-01T09:00:00'), // Default start time
          duration_hours: new Prisma.Decimal(durationHours),
          total_price: proposal.total,
          taxes: proposal.taxes,
          gratuity: proposal.gratuity_amount,
          deposit_amount: proposal.deposit_amount,
          deposit_paid: proposal.deposit_paid ?? false,
          status: 'confirmed',
          brand_id: proposal.brand_id,
          special_requests: proposal.special_notes,
          booked_by: userId,
        },
      })

      // 5. Update proposal status to 'booked' and link to booking
      await tx.trip_proposals.update({
        where: { id: proposalId },
        data: {
          converted_to_booking_id: booking.id,
          converted_at: new Date(),
          status: 'booked',
          updated_at: new Date(),
        },
      })

      // 6. Log activity
      await tx.trip_proposal_activity.create({
        data: {
          trip_proposal_id: proposalId,
          action: 'booked',
          description: `Converted to booking ${bookingNumber}`,
          actor_type: 'staff',
          actor_user_id: userId,
          metadata: {
            booking_id: booking.id,
            booking_number: bookingNumber,
          },
        },
      })

      return { booking_id: booking.id, booking_number: bookingNumber }
    })

    logger.info('Trip proposal converted to booking', {
      proposalId,
      bookingId: result.booking_id,
      bookingNumber: result.booking_number,
    })

    return {
      success: true,
      data: {
        booking_id: result.booking_id,
        booking_number: result.booking_number,
      },
    }
  } catch (error) {
    logger.error('Failed to convert proposal to booking', {
      error,
      proposalId,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert proposal',
    }
  }
}

// -----------------------------------------------------------------------------
// triggerConfirmationEmail — calls existing email service (non-blocking)
// -----------------------------------------------------------------------------

export async function triggerConfirmationEmail(
  bookingId: number
): Promise<ProposalConversionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Dynamically import to avoid circular deps and keep this lightweight
    const { tripProposalEmailService } = await import(
      '@/lib/services/trip-proposal-email.service'
    )

    // Find the proposal linked to this booking
    const proposal = await prisma.trip_proposals.findFirst({
      where: { converted_to_booking_id: bookingId },
      select: { id: true },
    })

    if (!proposal) {
      return { success: false, error: 'No proposal found for this booking' }
    }

    // Fire email — don't await to keep it non-blocking for the caller
    tripProposalEmailService
      .sendProposalAcceptedEmail(proposal.id)
      .catch((err: unknown) => {
        logger.error('Failed to send confirmation email', {
          error: err,
          bookingId,
          proposalId: proposal.id,
        })
      })

    return { success: true, data: { emailTriggered: true } }
  } catch (error) {
    logger.error('Failed to trigger confirmation email', { error, bookingId })
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to trigger email',
    }
  }
}
