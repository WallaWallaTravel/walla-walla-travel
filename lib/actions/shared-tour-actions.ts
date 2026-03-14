'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { sharedTourService } from '@/lib/services/shared-tour.service'
import { guestProfileService } from '@/lib/services/guest-profile.service'
import { tripProposalService } from '@/lib/services/trip-proposal.service'
import { getBrandStripeClient } from '@/lib/stripe-brands'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') return null
  return session
}

// ─────────────────────────────────────────────
// READS
// ─────────────────────────────────────────────

export async function getUpcomingToursAction() {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }
  const tours = await sharedTourService.getUpcomingTours()
  return { success: true, data: tours }
}

export async function getPresetsAction() {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }
  const rows = await prisma.$queryRaw<Array<{
    id: number
    name: string
    start_time: string
    duration_hours: number
    base_price_per_person: number
    lunch_price_per_person: number
    title: string | null
    description: string | null
    max_guests: number
    min_guests: number
    is_default: boolean
    sort_order: number
  }>>`
    SELECT id, name, start_time::text, duration_hours::float,
           base_price_per_person::float, lunch_price_per_person::float,
           title, description, max_guests, min_guests, is_default, sort_order
    FROM shared_tour_presets
    ORDER BY sort_order ASC, name ASC
  `
  return { success: true, data: rows }
}

export async function getAvailableVehiclesAction(
  date: string,
  startTime: string,
  durationHours: number
) {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }
  const vehicles = await sharedTourService.getAvailableVehicles(date, startTime, durationHours)
  return { success: true, data: vehicles }
}

// ─────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────

export async function createTourAction(data: {
  tour_date: string
  start_time?: string
  duration_hours?: number
  max_guests?: number
  min_guests?: number
  base_price_per_person?: number
  lunch_price_per_person?: number
  lunch_included_default?: boolean
  title?: string
  description?: string
  meeting_location?: string
  wineries_preview?: string[]
  booking_cutoff_hours?: number
  is_published?: boolean
  notes?: string
  vehicle_id?: number
  driver_id?: number
  auto_assign_vehicle?: boolean
  require_vehicle?: boolean
}): Promise<{
  success: boolean
  data?: unknown
  error?: string
  vehicle_info?: unknown
  vehicle_assigned?: boolean
  max_guests_locked_to_capacity?: boolean
  message?: string
}> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const result = await sharedTourService.createTour(data)

    let message = 'Shared tour created successfully'
    if (result.vehicle_assigned && result.vehicle_info) {
      message += `. Vehicle assigned: ${result.vehicle_info.name} (capacity: ${result.vehicle_info.capacity})`
    }
    if (result.max_guests_locked_to_capacity) {
      message += `. Note: max_guests was reduced to ${result.tour.max_guests} to match vehicle capacity`
    }

    revalidatePath('/admin/shared-tours')

    return {
      success: true,
      data: result.tour,
      vehicle_info: result.vehicle_info,
      vehicle_assigned: result.vehicle_assigned,
      max_guests_locked_to_capacity: result.max_guests_locked_to_capacity,
      message,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create tour'
    return { success: false, error: errorMessage }
  }
}

export async function cancelTourAction(tourId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const tour = await sharedTourService.cancelTour(tourId)
    if (!tour) return { success: false, error: 'Tour not found' }
    revalidatePath('/admin/shared-tours')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel tour'
    return { success: false, error: errorMessage }
  }
}

export async function togglePublishAction(
  tourId: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const tour = await sharedTourService.updateTour(tourId, { is_published: isPublished })
    if (!tour) return { success: false, error: 'Tour not found' }
    revalidatePath('/admin/shared-tours')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update tour'
    return { success: false, error: errorMessage }
  }
}

export async function savePresetAction(data: {
  name: string
  start_time?: string
  duration_hours?: number
  base_price_per_person?: number
  lunch_price_per_person?: number
  title?: string
  description?: string
  max_guests?: number
  min_guests?: number
  is_default?: boolean
}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  if (!data.name) return { success: false, error: 'name is required' }

  const existing = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM shared_tour_presets WHERE LOWER(name) = LOWER(${data.name})
  `
  if (existing.length > 0) {
    return { success: false, error: 'A preset with this name already exists' }
  }

  const sortRows = await prisma.$queryRaw<{ max_sort: number }[]>`
    SELECT COALESCE(MAX(sort_order), 0) + 1 as max_sort FROM shared_tour_presets
  `
  const nextSortOrder = sortRows[0]?.max_sort || 1

  const rows = await prisma.$queryRaw<unknown[]>`
    INSERT INTO shared_tour_presets (
      name, start_time, duration_hours, base_price_per_person, lunch_price_per_person,
      title, description, max_guests, min_guests, is_default, sort_order
    ) VALUES (
      ${data.name},
      ${data.start_time || '11:00'},
      ${data.duration_hours || 6},
      ${data.base_price_per_person || 95},
      ${data.lunch_price_per_person || 115},
      ${data.title || null},
      ${data.description || null},
      ${data.max_guests || 14},
      ${data.min_guests || 2},
      ${data.is_default || false},
      ${nextSortOrder}
    )
    RETURNING
      id, name, start_time::text, duration_hours::float,
      base_price_per_person::float, lunch_price_per_person::float,
      title, description, max_guests, min_guests, is_default, sort_order,
      created_at, updated_at
  `

  revalidatePath('/admin/shared-tours')
  return { success: true, data: (rows as unknown[])[0] }
}

export async function deletePresetAction(presetId: number): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const existing = await prisma.$queryRaw<{ id: number; is_default: boolean }[]>`
    SELECT id, is_default FROM shared_tour_presets WHERE id = ${presetId}
  `
  if (existing.length === 0) return { success: false, error: 'Preset not found' }

  const countRows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int as count FROM shared_tour_presets
  `
  if (countRows[0]?.count <= 1) {
    return { success: false, error: 'Cannot delete the last preset' }
  }

  await prisma.$executeRaw`DELETE FROM shared_tour_presets WHERE id = ${presetId}`

  if (existing[0]?.is_default) {
    await prisma.$executeRaw`
      UPDATE shared_tour_presets
      SET is_default = true, updated_at = NOW()
      WHERE id = (SELECT id FROM shared_tour_presets ORDER BY sort_order ASC LIMIT 1)
    `
  }

  revalidatePath('/admin/shared-tours')
  return { success: true }
}

export async function setDefaultPresetAction(presetId: number): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const existing = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM shared_tour_presets WHERE id = ${presetId}
  `
  if (existing.length === 0) return { success: false, error: 'Preset not found' }

  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `UPDATE shared_tour_presets
     SET is_default = CASE WHEN id = $1 THEN true ELSE false END, updated_at = NOW()
     WHERE true
     RETURNING id`,
    presetId
  )

  revalidatePath('/admin/shared-tours')
  return { success: true }
}

export async function linkProposalAction(
  tourId: string,
  proposalId: number | null
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const tour = await sharedTourService.updateTour(tourId, { trip_proposal_id: proposalId } as Parameters<typeof sharedTourService.updateTour>[1])
    if (!tour) return { success: false, error: 'Tour not found' }
    revalidatePath(`/admin/shared-tours/${tourId}`)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update trip proposal link'
    return { success: false, error: errorMessage }
  }
}

export async function importGuestsAction(
  tourId: string
): Promise<{ success: boolean; data?: { imported: number; skipped: number; total_tickets: number }; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const tourRows = await prisma.$queryRaw<{ id: string; trip_proposal_id: number | null }[]>`
    SELECT id, trip_proposal_id FROM shared_tours WHERE id = ${tourId}
  `
  const tour = tourRows[0]
  if (!tour) return { success: false, error: 'Shared tour not found' }
  if (!tour.trip_proposal_id) {
    return { success: false, error: 'This shared tour is not linked to a trip proposal. Set trip_proposal_id first.' }
  }

  const proposal = await tripProposalService.getById(tour.trip_proposal_id)
  if (!proposal) return { success: false, error: 'Linked trip proposal not found' }

  const tickets = await sharedTourService.getTicketsForTour(tourId)

  let importedCount = 0
  let skippedCount = 0

  for (const ticket of tickets) {
    if (!ticket.customer_email) {
      skippedCount++
      continue
    }

    const alreadyExists = await tripProposalService.isEmailRegistered(
      tour.trip_proposal_id,
      ticket.customer_email
    )

    if (alreadyExists) {
      skippedCount++
      continue
    }

    let guestProfileId: number | undefined
    try {
      const profile = await guestProfileService.findOrCreateByEmail(
        ticket.customer_email,
        { name: ticket.customer_name, phone: ticket.customer_phone }
      )
      guestProfileId = profile.id

      if (!ticket.guest_profile_id) {
        await sharedTourService.linkGuestProfile(ticket.id, profile.id)
      }
    } catch (err) {
      logger.error('Failed to create guest profile during import', { error: err })
    }

    await tripProposalService.addGuest(tour.trip_proposal_id, {
      name: ticket.customer_name,
      email: ticket.customer_email,
      phone: ticket.customer_phone || undefined,
      is_primary: false,
      dietary_restrictions: ticket.dietary_restrictions || undefined,
    })

    if (guestProfileId) {
      try {
        await prisma.$executeRaw`
          UPDATE trip_proposal_guests
          SET guest_profile_id = ${guestProfileId}
          WHERE trip_proposal_id = ${tour.trip_proposal_id} AND LOWER(email) = LOWER(${ticket.customer_email})
        `
      } catch (err) {
        logger.error('Failed to link guest profile to proposal guest', { error: err })
      }
    }

    importedCount++
  }

  return {
    success: true,
    data: {
      imported: importedCount,
      skipped: skippedCount,
      total_tickets: tickets.length,
    },
  }
}

export async function checkInTicketAction(ticketId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const ticket = await sharedTourService.checkInTicket(ticketId)
  if (!ticket) return { success: false, error: 'Ticket not found' }
  return { success: true }
}

export async function reassignVehicleAction(
  tourId: string,
  vehicleId: number | undefined
): Promise<{ success: boolean; data?: unknown; vehicle_info?: unknown; message?: string; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const result = await sharedTourService.reassignVehicle(tourId, vehicleId)
    revalidatePath(`/admin/shared-tours/${tourId}`)
    return {
      success: true,
      data: result.tour,
      vehicle_info: result.vehicle_info,
      message: `Vehicle reassigned to ${result.vehicle_info.name}`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reassign vehicle'
    return { success: false, error: errorMessage }
  }
}

export async function previewDiscountAction(
  tourId: string,
  discountType: 'flat' | 'percentage',
  discountAmount: number,
  reason?: string
): Promise<{ success: boolean; preview?: unknown; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  if (discountType === 'percentage' && discountAmount > 100) {
    return { success: false, error: 'Percentage discount cannot exceed 100%' }
  }

  const tour = await sharedTourService.getTourWithAvailability(tourId)
  if (!tour) return { success: false, error: 'Tour not found' }

  const tourWithDiscountRows = await prisma.$queryRaw<{
    discount_type: string | null
    discount_amount: number | null
  }[]>`
    SELECT discount_type, discount_amount FROM shared_tours WHERE id = ${tourId}
  `

  if (tourWithDiscountRows[0]?.discount_type && tourWithDiscountRows[0]?.discount_type !== 'none') {
    return { success: false, error: 'A discount has already been applied to this tour' }
  }

  const originalBasePrice = Number(tour.base_price_per_person)
  const originalLunchPrice = Number(tour.lunch_price_per_person)

  let newBasePrice: number
  let newLunchPrice: number

  if (discountType === 'flat') {
    newBasePrice = Math.max(0, originalBasePrice - discountAmount)
    newLunchPrice = Math.max(0, originalLunchPrice - discountAmount)
  } else {
    const multiplier = 1 - (discountAmount / 100)
    newBasePrice = Math.round(originalBasePrice * multiplier * 100) / 100
    newLunchPrice = Math.round(originalLunchPrice * multiplier * 100) / 100
  }

  const ticketsRows = await prisma.$queryRaw<{
    id: string
    ticket_number: string
    customer_name: string
    customer_email: string
    ticket_count: number
    includes_lunch: boolean
    price_per_person: number
    total_amount: number
    payment_status: string
    status: string
    stripe_payment_intent_id: string | null
  }[]>`
    SELECT
      id, ticket_number, customer_name, customer_email, ticket_count,
      includes_lunch, price_per_person, total_amount, payment_status, status,
      stripe_payment_intent_id
    FROM shared_tours_tickets
    WHERE tour_id = ${tourId}
    ORDER BY created_at
  `

  const warnings: string[] = []
  const ticketsAffected: Array<{
    ticket_id: string
    ticket_number: string
    customer_name: string
    customer_email: string
    ticket_count: number
    includes_lunch: boolean
    original_paid: number
    new_price: number
    refund_amount: number
    stripe_payment_intent_id: string | null
  }> = []
  let totalRefund = 0

  for (const ticket of ticketsRows) {
    if (ticket.status === 'cancelled') continue

    if (ticket.payment_status === 'paid') {
      const originalPricePerPerson = Number(ticket.price_per_person)
      const newPricePerPerson = ticket.includes_lunch ? newLunchPrice : newBasePrice

      let refundPerPerson: number
      if (discountType === 'flat') {
        refundPerPerson = discountAmount
      } else {
        refundPerPerson = Math.round(originalPricePerPerson * (discountAmount / 100) * 100) / 100
      }

      const refundAmount = Math.round(refundPerPerson * ticket.ticket_count * 100) / 100

      if (!ticket.stripe_payment_intent_id) {
        warnings.push(`Ticket ${ticket.ticket_number} (${ticket.customer_name}) was paid but has no Stripe payment intent - manual refund may be needed`)
      }

      ticketsAffected.push({
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        customer_name: ticket.customer_name,
        customer_email: ticket.customer_email,
        ticket_count: ticket.ticket_count,
        includes_lunch: ticket.includes_lunch,
        original_paid: Number(ticket.total_amount),
        new_price: Math.round(newPricePerPerson * ticket.ticket_count * 100) / 100,
        refund_amount: refundAmount,
        stripe_payment_intent_id: ticket.stripe_payment_intent_id,
      })

      totalRefund += refundAmount
    } else if (ticket.payment_status === 'pending') {
      warnings.push(`Ticket ${ticket.ticket_number} (${ticket.customer_name}) is unpaid - will use new discounted price when paid`)
    }
  }

  const preview = {
    original_base_price: originalBasePrice,
    new_base_price: newBasePrice,
    original_lunch_price: originalLunchPrice,
    new_lunch_price: newLunchPrice,
    tickets_affected: ticketsAffected,
    total_refund: Math.round(totalRefund * 100) / 100,
    can_apply: true,
    warnings,
  }

  return { success: true, preview }
}

export async function applyDiscountAction(
  tourId: string,
  discountType: 'flat' | 'percentage',
  discountAmount: number,
  reason?: string
): Promise<{ success: boolean; message?: string; refunds_issued?: unknown; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  if (discountType === 'percentage' && discountAmount > 100) {
    return { success: false, error: 'Percentage discount cannot exceed 100%' }
  }

  const tour = await sharedTourService.getTourWithAvailability(tourId)
  if (!tour) return { success: false, error: 'Tour not found' }

  const tourWithDiscountRows = await prisma.$queryRaw<{
    discount_type: string | null
    discount_amount: number | null
  }[]>`
    SELECT discount_type, discount_amount FROM shared_tours WHERE id = ${tourId}
  `

  if (tourWithDiscountRows[0]?.discount_type && tourWithDiscountRows[0]?.discount_type !== 'none') {
    return { success: false, error: 'A discount has already been applied to this tour' }
  }

  const originalBasePrice = Number(tour.base_price_per_person)
  const originalLunchPrice = Number(tour.lunch_price_per_person)

  let newBasePrice: number
  let newLunchPrice: number

  if (discountType === 'flat') {
    newBasePrice = Math.max(0, originalBasePrice - discountAmount)
    newLunchPrice = Math.max(0, originalLunchPrice - discountAmount)
  } else {
    const multiplier = 1 - (discountAmount / 100)
    newBasePrice = Math.round(originalBasePrice * multiplier * 100) / 100
    newLunchPrice = Math.round(originalLunchPrice * multiplier * 100) / 100
  }

  const ticketsRows = await prisma.$queryRaw<{
    id: string
    ticket_number: string
    customer_name: string
    customer_email: string
    ticket_count: number
    includes_lunch: boolean
    price_per_person: number
    total_amount: number
    payment_status: string
    status: string
    stripe_payment_intent_id: string | null
  }[]>`
    SELECT
      id, ticket_number, customer_name, customer_email, ticket_count,
      includes_lunch, price_per_person, total_amount, payment_status, status,
      stripe_payment_intent_id
    FROM shared_tours_tickets
    WHERE tour_id = ${tourId}
    ORDER BY created_at
  `

  const ticketsAffected: Array<{
    ticket_id: string
    ticket_number: string
    includes_lunch: boolean
    ticket_count: number
    refund_amount: number
    new_price: number
    stripe_payment_intent_id: string | null
  }> = []

  for (const ticket of ticketsRows) {
    if (ticket.status === 'cancelled') continue
    if (ticket.payment_status !== 'paid') continue

    const originalPricePerPerson = Number(ticket.price_per_person)
    const newPricePerPerson = ticket.includes_lunch ? newLunchPrice : newBasePrice

    let refundPerPerson: number
    if (discountType === 'flat') {
      refundPerPerson = discountAmount
    } else {
      refundPerPerson = Math.round(originalPricePerPerson * (discountAmount / 100) * 100) / 100
    }

    const refundAmount = Math.round(refundPerPerson * ticket.ticket_count * 100) / 100

    ticketsAffected.push({
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      includes_lunch: ticket.includes_lunch,
      ticket_count: ticket.ticket_count,
      refund_amount: refundAmount,
      new_price: Math.round(newPricePerPerson * ticket.ticket_count * 100) / 100,
      stripe_payment_intent_id: ticket.stripe_payment_intent_id,
    })
  }

  const stripe = getBrandStripeClient()
  if (!stripe) {
    return { success: false, error: 'Payment processing not configured' }
  }

  const refundResults: Array<{
    ticket_id: string
    ticket_number: string
    refund_id: string | null
    amount: number
    status: 'succeeded' | 'failed' | 'skipped'
    error?: string
  }> = []

  try {
    await prisma.$executeRaw`
      UPDATE shared_tours
      SET
        base_price_per_person = ${newBasePrice},
        lunch_price_per_person = ${newLunchPrice},
        discount_type = ${discountType},
        discount_amount = ${discountAmount},
        discount_reason = ${reason || null},
        discount_applied_at = NOW(),
        discount_applied_by = ${session.user.email},
        updated_at = NOW()
      WHERE id = ${tourId}
    `

    for (const ticket of ticketsAffected) {
      if (!ticket.stripe_payment_intent_id) {
        refundResults.push({
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          refund_id: null,
          amount: ticket.refund_amount,
          status: 'skipped',
          error: 'No Stripe payment intent - manual refund needed',
        })
        continue
      }

      try {
        const refundAmountCents = Math.round(ticket.refund_amount * 100)
        const refund = await stripe.refunds.create(
          {
            payment_intent: ticket.stripe_payment_intent_id,
            amount: refundAmountCents,
            reason: 'requested_by_customer',
            metadata: {
              type: 'shared_tour_discount',
              tour_id: tourId,
              ticket_id: ticket.ticket_id,
              discount_type: discountType,
              discount_amount: String(discountAmount),
              discount_reason: reason || '',
            },
          },
          {
            idempotencyKey: `refund_${ticket.stripe_payment_intent_id}_${refundAmountCents}`,
          }
        )

        await prisma.$executeRaw`
          UPDATE shared_tours_tickets
          SET
            refund_amount = COALESCE(refund_amount, 0) + ${ticket.refund_amount},
            refund_id = ${refund.id},
            refund_status = ${refund.status},
            refunded_at = NOW(),
            original_price_per_person = COALESCE(original_price_per_person, price_per_person),
            original_total_amount = COALESCE(original_total_amount, total_amount),
            price_per_person = ${ticket.includes_lunch ? newLunchPrice : newBasePrice},
            total_amount = ${ticket.new_price},
            payment_status = 'partial_refund',
            updated_at = NOW()
          WHERE id = ${ticket.ticket_id}
        `

        refundResults.push({
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          refund_id: refund.id,
          amount: ticket.refund_amount,
          status: 'succeeded',
        })

        logger.info('Discount refund issued', {
          tourId,
          ticketId: ticket.ticket_id,
          refundId: refund.id,
          amount: ticket.refund_amount,
        })
      } catch (refundError) {
        const errorMessage = refundError instanceof Error ? refundError.message : 'Unknown error'
        logger.error('Failed to issue discount refund', {
          tourId,
          ticketId: ticket.ticket_id,
          error: errorMessage,
        })

        refundResults.push({
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          refund_id: null,
          amount: ticket.refund_amount,
          status: 'failed',
          error: errorMessage,
        })
      }
    }

    await prisma.$executeRaw`
      UPDATE shared_tours_tickets
      SET
        price_per_person = CASE
          WHEN includes_lunch THEN ${newLunchPrice}
          ELSE ${newBasePrice}
        END,
        total_amount = ticket_count * CASE
          WHEN includes_lunch THEN ${newLunchPrice}
          ELSE ${newBasePrice}
        END,
        updated_at = NOW()
      WHERE tour_id = ${tourId}
        AND payment_status = 'pending'
        AND status != 'cancelled'
    `

    const successCount = refundResults.filter(r => r.status === 'succeeded').length
    const failedCount = refundResults.filter(r => r.status === 'failed').length

    revalidatePath(`/admin/shared-tours/${tourId}`)

    return {
      success: true,
      message: `Discount applied. ${successCount} refund(s) processed successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      refunds_issued: refundResults,
    }
  } catch (error) {
    logger.error('Failed to apply discount', {
      tourId,
      error: error instanceof Error ? error.message : error,
    })
    return { success: false, error: 'Failed to apply discount. Please try again.' }
  }
}
