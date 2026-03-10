'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/lib/generated/prisma/client'
import { generateSecureString } from '@/lib/utils'
import {
  CreateProposalSchema,
  UpdateProposalDetailsSchema,
  UpsertDaySchema,
  UpsertStopSchema,
  ManageGuestSchema,
  UpsertInclusionSchema,
  UpdatePricingSchema,
  UpdateProposalStatusSchema,
  type CreateProposalInput,
  type UpdateProposalDetailsInput,
  type UpsertDayInput,
  type UpsertStopInput,
  type ManageGuestInput,
  type UpsertInclusionInput,
  type UpdatePricingInput,
  type UpdateProposalStatusInput,
} from '@/lib/schemas/trip-proposal'

// ============================================================================
// Types
// ============================================================================

export type ActionResult<T = undefined> = {
  success: boolean
  data?: T
  error?: string | Record<string, string[]>
}

// ============================================================================
// Auth helper
// ============================================================================

async function requireAdmin() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }
  return session
}

// ============================================================================
// Proposal number generation
// ============================================================================

async function generateProposalNumber(): Promise<string> {
  try {
    const result = await prisma.$queryRawUnsafe<{ proposal_number: string }[]>(
      'SELECT generate_trip_proposal_number() as proposal_number'
    )
    return result[0]?.proposal_number || `TP-${Date.now()}`
  } catch {
    // Fallback if function doesn't exist
    const prefix = 'TP'
    const year = new Date().getFullYear()
    const count = await prisma.trip_proposals.count()
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`
  }
}

// ============================================================================
// createProposal — create a new proposal with Prisma
// ============================================================================

export async function createProposal(
  data: CreateProposalInput
): Promise<ActionResult<{ id: number; proposal_number: string }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = CreateProposalSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const proposalNumber = await generateProposalNumber()

    // Calculate valid_until (30 days default)
    let validUntil: Date | null = null
    if (v.valid_until) {
      validUntil = new Date(v.valid_until)
    } else {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      validUntil = d
    }

    const accessToken = generateSecureString(64)

    const proposal = await prisma.trip_proposals.create({
      data: {
        proposal_number: proposalNumber,
        access_token: accessToken,
        status: 'draft',
        customer_name: v.customer_name,
        customer_email: v.customer_email || null,
        customer_phone: v.customer_phone || null,
        customer_company: v.customer_company || null,
        trip_type: v.trip_type || 'wine_tour',
        trip_title: v.trip_title || null,
        party_size: v.party_size,
        start_date: new Date(v.start_date),
        end_date: v.end_date ? new Date(v.end_date) : null,
        brand_id: v.brand_id || null,
        introduction: v.introduction || null,
        special_notes: v.special_notes || null,
        internal_notes: v.internal_notes || null,
        valid_until: validUntil,
        discount_percentage: v.discount_percentage ?? 0,
        discount_reason: v.discount_reason || null,
        gratuity_percentage: v.gratuity_percentage ?? 0,
        tax_rate: v.tax_rate ?? 0.091,
        deposit_percentage: v.deposit_percentage ?? 50,
        created_by: session.user.id ? session.user.id : null,
      },
    })

    // Create first day automatically
    const maxDay = await prisma.trip_proposal_days.aggregate({
      where: { trip_proposal_id: proposal.id },
      _max: { day_number: true },
    })
    const dayNumber = (maxDay._max.day_number ?? 0) + 1

    await prisma.trip_proposal_days.create({
      data: {
        trip_proposal_id: proposal.id,
        day_number: dayNumber,
        date: new Date(v.start_date),
        title: 'Day 1',
      },
    })

    // Log activity
    await prisma.trip_proposal_activity.create({
      data: {
        trip_proposal_id: proposal.id,
        action: 'created',
        description: 'Trip proposal created',
        actor_type: 'staff',
        actor_user_id: session.user.id ? session.user.id : null,
      },
    })

    return {
      success: true,
      data: {
        id: proposal.id,
        proposal_number: proposal.proposal_number,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create proposal'
    return { success: false, error: message }
  }
}

// ============================================================================
// updateProposalDetails — update overview fields
// ============================================================================

export async function updateProposalDetails(
  proposalId: number,
  data: UpdateProposalDetailsInput
): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpdateProposalDetailsSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    // Verify proposal exists
    const existing = await prisma.trip_proposals.findUnique({
      where: { id: proposalId },
      select: { id: true },
    })
    if (!existing) return { success: false, error: 'Proposal not found' }

    // Build update data — only include fields that were provided
    const updateData: Prisma.trip_proposalsUpdateInput = {
      updated_at: new Date(),
    }
    if (v.customer_name !== undefined) updateData.customer_name = v.customer_name
    if (v.customer_email !== undefined) updateData.customer_email = v.customer_email || null
    if (v.customer_phone !== undefined) updateData.customer_phone = v.customer_phone || null
    if (v.customer_company !== undefined) updateData.customer_company = v.customer_company || null
    if (v.trip_type !== undefined) updateData.trip_type = v.trip_type
    if (v.trip_title !== undefined) updateData.trip_title = v.trip_title || null
    if (v.party_size !== undefined) updateData.party_size = v.party_size
    if (v.start_date !== undefined) updateData.start_date = new Date(v.start_date)
    if (v.end_date !== undefined) updateData.end_date = v.end_date ? new Date(v.end_date) : null
    if (v.brand_id !== undefined) {
      if (v.brand_id) {
        updateData.brands = { connect: { id: v.brand_id } }
      } else {
        updateData.brands = { disconnect: true }
      }
    }
    if (v.introduction !== undefined) updateData.introduction = v.introduction || null
    if (v.special_notes !== undefined) updateData.special_notes = v.special_notes || null
    if (v.internal_notes !== undefined) updateData.internal_notes = v.internal_notes || null
    if (v.valid_until !== undefined) {
      updateData.valid_until = v.valid_until ? new Date(v.valid_until) : null
    }

    await prisma.trip_proposals.update({
      where: { id: proposalId },
      data: updateData,
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update proposal'
    return { success: false, error: message }
  }
}

// ============================================================================
// Day operations
// ============================================================================

export async function addDay(
  proposalId: number,
  data: UpsertDayInput
): Promise<ActionResult<{ id: number; day_number: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpsertDaySchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { id: proposalId },
      select: { id: true },
    })
    if (!proposal) return { success: false, error: 'Proposal not found' }

    const maxDay = await prisma.trip_proposal_days.aggregate({
      where: { trip_proposal_id: proposalId },
      _max: { day_number: true },
    })
    const dayNumber = (maxDay._max.day_number ?? 0) + 1

    const day = await prisma.trip_proposal_days.create({
      data: {
        trip_proposal_id: proposalId,
        day_number: dayNumber,
        date: new Date(v.date),
        title: v.title || `Day ${dayNumber}`,
        description: v.description || null,
        notes: v.notes || null,
        internal_notes: v.internal_notes || null,
      },
    })

    await prisma.trip_proposals.update({
      where: { id: proposalId },
      data: { updated_at: new Date() },
    })

    return { success: true, data: { id: day.id, day_number: day.day_number } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add day'
    return { success: false, error: message }
  }
}

export async function updateDay(
  dayId: number,
  data: UpsertDayInput
): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpsertDaySchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const existing = await prisma.trip_proposal_days.findUnique({
      where: { id: dayId },
      select: { id: true, trip_proposal_id: true },
    })
    if (!existing) return { success: false, error: 'Day not found' }

    await prisma.trip_proposal_days.update({
      where: { id: dayId },
      data: {
        date: new Date(v.date),
        title: v.title || undefined,
        description: v.description ?? undefined,
        notes: v.notes ?? undefined,
        internal_notes: v.internal_notes ?? undefined,
        updated_at: new Date(),
      },
    })

    await prisma.trip_proposals.update({
      where: { id: existing.trip_proposal_id },
      data: { updated_at: new Date() },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update day'
    return { success: false, error: message }
  }
}

export async function removeDay(dayId: number): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const existing = await prisma.trip_proposal_days.findUnique({
      where: { id: dayId },
      select: { id: true, trip_proposal_id: true },
    })
    if (!existing) return { success: false, error: 'Day not found' }

    // Cascade delete will remove stops too (defined in schema)
    await prisma.trip_proposal_days.delete({
      where: { id: dayId },
    })

    // Re-number remaining days
    const remainingDays = await prisma.trip_proposal_days.findMany({
      where: { trip_proposal_id: existing.trip_proposal_id },
      orderBy: { day_number: 'asc' },
      select: { id: true },
    })

    for (let i = 0; i < remainingDays.length; i++) {
      await prisma.trip_proposal_days.update({
        where: { id: remainingDays[i].id },
        data: { day_number: i + 1 },
      })
    }

    await prisma.trip_proposals.update({
      where: { id: existing.trip_proposal_id },
      data: { updated_at: new Date() },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove day'
    return { success: false, error: message }
  }
}

// ============================================================================
// Stop operations
// ============================================================================

export async function addStop(
  dayId: number,
  data: UpsertStopInput
): Promise<ActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpsertStopSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const day = await prisma.trip_proposal_days.findUnique({
      where: { id: dayId },
      select: { id: true, trip_proposal_id: true },
    })
    if (!day) return { success: false, error: 'Day not found' }

    // Get next stop order if not provided
    let stopOrder = v.stop_order
    if (stopOrder === undefined) {
      const maxOrder = await prisma.trip_proposal_stops.aggregate({
        where: { trip_proposal_day_id: dayId },
        _max: { stop_order: true },
      })
      stopOrder = (maxOrder._max.stop_order ?? -1) + 1
    }

    const stop = await prisma.trip_proposal_stops.create({
      data: {
        trip_proposal_day_id: dayId,
        stop_order: stopOrder,
        stop_type: v.stop_type,
        winery_id: v.winery_id || null,
        restaurant_id: v.restaurant_id || null,
        hotel_id: v.hotel_id || null,
        custom_name: v.custom_name || null,
        custom_address: v.custom_address || null,
        custom_description: v.custom_description || null,
        scheduled_time: v.scheduled_time ? new Date(`1970-01-01T${v.scheduled_time}:00`) : null,
        duration_minutes: v.duration_minutes || null,
        per_person_cost: 0, // Always 0 — billing is at service level
        flat_cost: 0, // Always 0 — billing is at service level
        cost_note: v.cost_note || null,
        room_rate: v.room_rate || 0,
        num_rooms: v.num_rooms || 0,
        nights: v.nights || 1,
        reservation_status: v.reservation_status || 'pending',
        reservation_confirmation: v.reservation_confirmation || null,
        reservation_contact: v.reservation_contact || null,
        reservation_notes: v.reservation_notes || null,
        client_notes: v.client_notes || null,
        internal_notes: v.internal_notes || null,
        driver_notes: v.driver_notes || null,
      },
    })

    await prisma.trip_proposals.update({
      where: { id: day.trip_proposal_id },
      data: { updated_at: new Date() },
    })

    return { success: true, data: { id: stop.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add stop'
    return { success: false, error: message }
  }
}

export async function updateStop(
  stopId: number,
  data: UpsertStopInput
): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpsertStopSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const existing = await prisma.trip_proposal_stops.findUnique({
      where: { id: stopId },
      select: {
        id: true,
        trip_proposal_days: {
          select: { trip_proposal_id: true },
        },
      },
    })
    if (!existing) return { success: false, error: 'Stop not found' }

    await prisma.trip_proposal_stops.update({
      where: { id: stopId },
      data: {
        stop_type: v.stop_type,
        stop_order: v.stop_order ?? undefined,
        winery_id: v.winery_id ?? undefined,
        restaurant_id: v.restaurant_id ?? undefined,
        hotel_id: v.hotel_id ?? undefined,
        custom_name: v.custom_name ?? undefined,
        custom_address: v.custom_address ?? undefined,
        custom_description: v.custom_description ?? undefined,
        scheduled_time: v.scheduled_time ? new Date(`1970-01-01T${v.scheduled_time}:00`) : undefined,
        duration_minutes: v.duration_minutes ?? undefined,
        per_person_cost: 0, // Always 0 — billing is at service level
        flat_cost: 0, // Always 0 — billing is at service level
        cost_note: v.cost_note ?? undefined,
        room_rate: v.room_rate ?? undefined,
        num_rooms: v.num_rooms ?? undefined,
        nights: v.nights ?? undefined,
        reservation_status: v.reservation_status ?? undefined,
        reservation_confirmation: v.reservation_confirmation ?? undefined,
        reservation_contact: v.reservation_contact ?? undefined,
        reservation_notes: v.reservation_notes ?? undefined,
        client_notes: v.client_notes ?? undefined,
        internal_notes: v.internal_notes ?? undefined,
        driver_notes: v.driver_notes ?? undefined,
        updated_at: new Date(),
      },
    })

    await prisma.trip_proposals.update({
      where: { id: existing.trip_proposal_days.trip_proposal_id },
      data: { updated_at: new Date() },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update stop'
    return { success: false, error: message }
  }
}

export async function removeStop(stopId: number): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const existing = await prisma.trip_proposal_stops.findUnique({
      where: { id: stopId },
      select: {
        id: true,
        trip_proposal_day_id: true,
        trip_proposal_days: {
          select: { trip_proposal_id: true },
        },
      },
    })
    if (!existing) return { success: false, error: 'Stop not found' }

    await prisma.trip_proposal_stops.delete({
      where: { id: stopId },
    })

    // Re-order remaining stops
    const remainingStops = await prisma.trip_proposal_stops.findMany({
      where: { trip_proposal_day_id: existing.trip_proposal_day_id },
      orderBy: { stop_order: 'asc' },
      select: { id: true },
    })

    for (let i = 0; i < remainingStops.length; i++) {
      await prisma.trip_proposal_stops.update({
        where: { id: remainingStops[i].id },
        data: { stop_order: i },
      })
    }

    await prisma.trip_proposals.update({
      where: { id: existing.trip_proposal_days.trip_proposal_id },
      data: { updated_at: new Date() },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove stop'
    return { success: false, error: message }
  }
}

// ============================================================================
// Guest operations
// ============================================================================

export async function addGuest(
  proposalId: number,
  data: ManageGuestInput
): Promise<ActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = ManageGuestSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { id: proposalId },
      select: { id: true },
    })
    if (!proposal) return { success: false, error: 'Proposal not found' }

    const guest = await prisma.trip_proposal_guests.create({
      data: {
        trip_proposal_id: proposalId,
        name: v.name,
        email: v.email || null,
        phone: v.phone || null,
        is_primary: v.is_primary ?? false,
        dietary_restrictions: v.dietary_restrictions || null,
        accessibility_needs: v.accessibility_needs || null,
        special_requests: v.special_requests || null,
        room_assignment: v.room_assignment || null,
        rsvp_status: v.rsvp_status || 'pending',
      },
    })

    await prisma.trip_proposals.update({
      where: { id: proposalId },
      data: { updated_at: new Date() },
    })

    return { success: true, data: { id: guest.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add guest'
    return { success: false, error: message }
  }
}

export async function removeGuest(guestId: number): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const existing = await prisma.trip_proposal_guests.findUnique({
      where: { id: guestId },
      select: { id: true, trip_proposal_id: true },
    })
    if (!existing) return { success: false, error: 'Guest not found' }

    await prisma.trip_proposal_guests.delete({
      where: { id: guestId },
    })

    await prisma.trip_proposals.update({
      where: { id: existing.trip_proposal_id },
      data: { updated_at: new Date() },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove guest'
    return { success: false, error: message }
  }
}

// ============================================================================
// Inclusion (service line item) operations
// Billing is at SERVICE level. subtotal = sum of all inclusion totals.
// ============================================================================

export async function upsertInclusion(
  proposalId: number,
  data: UpsertInclusionInput
): Promise<ActionResult<{ id: number }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpsertInclusionSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { id: proposalId },
      select: { id: true, party_size: true },
    })
    if (!proposal) return { success: false, error: 'Proposal not found' }

    // Calculate total_price based on pricing_type
    let totalPrice = v.total_price ?? 0
    const pricingType = v.pricing_type || 'flat'
    const unitPrice = v.unit_price ?? 0
    const quantity = v.quantity ?? 1

    if (pricingType === 'flat') {
      totalPrice = unitPrice
    } else if (pricingType === 'per_person') {
      totalPrice = unitPrice * proposal.party_size
    } else if (pricingType === 'per_day') {
      totalPrice = unitPrice * quantity
    }

    let inclusionId: number

    if (v.id) {
      // Update existing
      const existing = await prisma.trip_proposal_inclusions.findUnique({
        where: { id: v.id },
        select: { id: true, trip_proposal_id: true },
      })
      if (!existing || existing.trip_proposal_id !== proposalId) {
        return { success: false, error: 'Inclusion not found' }
      }

      await prisma.trip_proposal_inclusions.update({
        where: { id: v.id },
        data: {
          inclusion_type: v.inclusion_type,
          description: v.description,
          quantity: quantity,
          unit: v.unit || null,
          unit_price: unitPrice,
          total_price: totalPrice,
          sort_order: v.sort_order ?? 0,
          show_on_proposal: v.show_on_proposal ?? true,
          notes: v.notes || null,
          updated_at: new Date(),
        },
      })
      inclusionId = v.id
    } else {
      // Create new
      const inclusion = await prisma.trip_proposal_inclusions.create({
        data: {
          trip_proposal_id: proposalId,
          inclusion_type: v.inclusion_type,
          description: v.description,
          quantity: quantity,
          unit: v.unit || null,
          unit_price: unitPrice,
          total_price: totalPrice,
          sort_order: v.sort_order ?? 0,
          show_on_proposal: v.show_on_proposal ?? true,
          notes: v.notes || null,
        },
      })
      inclusionId = inclusion.id
    }

    await prisma.trip_proposals.update({
      where: { id: proposalId },
      data: { updated_at: new Date() },
    })

    return { success: true, data: { id: inclusionId } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save inclusion'
    return { success: false, error: message }
  }
}

export async function removeInclusion(inclusionId: number): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const existing = await prisma.trip_proposal_inclusions.findUnique({
      where: { id: inclusionId },
      select: { id: true, trip_proposal_id: true },
    })
    if (!existing) return { success: false, error: 'Inclusion not found' }

    await prisma.trip_proposal_inclusions.delete({
      where: { id: inclusionId },
    })

    await prisma.trip_proposals.update({
      where: { id: existing.trip_proposal_id },
      data: { updated_at: new Date() },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove inclusion'
    return { success: false, error: message }
  }
}

// ============================================================================
// updatePricing — recalculate and save pricing
//
// Pricing formula (from inclusions ONLY — never stop costs):
//   subtotal = sum of all inclusion total_price
//   discount_amount = subtotal x discount_percentage
//   subtotal_after_discount = subtotal - discount_amount
//   taxes = subtotal_after_discount x tax_rate
//   gratuity = subtotal_after_discount x gratuity_percentage
//   total = subtotal_after_discount + taxes + gratuity
//   deposit = total x deposit_percentage
//   balance_due = total - deposit
// ============================================================================

export async function updatePricing(
  proposalId: number,
  data?: UpdatePricingInput
): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  if (data) {
    const parsed = UpdatePricingSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }
  }

  try {
    // Fetch proposal with current pricing settings
    const proposal = await prisma.trip_proposals.findUnique({
      where: { id: proposalId },
      select: {
        id: true,
        tax_rate: true,
        gratuity_percentage: true,
        discount_percentage: true,
        deposit_percentage: true,
        deposit_paid: true,
      },
    })
    if (!proposal) return { success: false, error: 'Proposal not found' }

    // Apply any new pricing settings
    const taxRate = data?.tax_rate ?? Number(proposal.tax_rate ?? 0.091)
    const gratuityPct = data?.gratuity_percentage ?? (proposal.gratuity_percentage ?? 0)
    const discountPct = data?.discount_percentage ?? Number(proposal.discount_percentage ?? 0)
    const depositPct = data?.deposit_percentage ?? (proposal.deposit_percentage ?? 50)

    // Calculate subtotal FROM INCLUSIONS ONLY — never from stop costs
    const inclusions = await prisma.trip_proposal_inclusions.findMany({
      where: { trip_proposal_id: proposalId },
      select: { total_price: true },
    })

    const subtotal = inclusions.reduce(
      (sum, inc) => sum + Number(inc.total_price ?? 0),
      0
    )

    // Pricing formula
    const discountAmount = subtotal * (discountPct / 100)
    const subtotalAfterDiscount = subtotal - discountAmount
    const taxes = subtotalAfterDiscount * taxRate
    const gratuityAmount = subtotalAfterDiscount * (gratuityPct / 100)
    const total = subtotalAfterDiscount + taxes + gratuityAmount
    const depositAmount = total * (depositPct / 100)
    const balanceDue = total - (proposal.deposit_paid ? depositAmount : 0)

    await prisma.trip_proposals.update({
      where: { id: proposalId },
      data: {
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        discount_percentage: new Prisma.Decimal(discountPct.toFixed(2)),
        discount_amount: new Prisma.Decimal(discountAmount.toFixed(2)),
        discount_reason: data?.discount_reason ?? undefined,
        tax_rate: new Prisma.Decimal(taxRate.toFixed(4)),
        taxes: new Prisma.Decimal(taxes.toFixed(2)),
        gratuity_percentage: gratuityPct,
        gratuity_amount: new Prisma.Decimal(gratuityAmount.toFixed(2)),
        total: new Prisma.Decimal(total.toFixed(2)),
        deposit_percentage: depositPct,
        deposit_amount: new Prisma.Decimal(depositAmount.toFixed(2)),
        balance_due: new Prisma.Decimal(balanceDue.toFixed(2)),
        updated_at: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update pricing'
    return { success: false, error: message }
  }
}

// ============================================================================
// shareProposal — generate/return public link
// ============================================================================

export async function shareProposal(
  proposalId: number
): Promise<ActionResult<{ url: string; proposal_number: string }>> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { id: proposalId },
      select: { id: true, proposal_number: true, status: true, sent_at: true },
    })
    if (!proposal) return { success: false, error: 'Proposal not found' }

    // Update status to sent if currently draft
    if (proposal.status === 'draft') {
      await prisma.trip_proposals.update({
        where: { id: proposalId },
        data: {
          status: 'sent',
          sent_at: new Date(),
          updated_at: new Date(),
        },
      })

      await prisma.trip_proposal_activity.create({
        data: {
          trip_proposal_id: proposalId,
          action: 'sent',
          description: 'Proposal shared/sent to client',
          actor_type: 'staff',
          actor_user_id: session.user.id ? session.user.id : null,
        },
      })
    }

    // Public URL uses proposal number
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wallawalla.travel'
    const url = `${baseUrl}/trip-proposals/${proposal.proposal_number}`

    return {
      success: true,
      data: { url, proposal_number: proposal.proposal_number },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to share proposal'
    return { success: false, error: message }
  }
}

// ============================================================================
// updateProposalStatus — change status
// ============================================================================

export async function updateProposalStatus(
  proposalId: number,
  data: UpdateProposalStatusInput
): Promise<ActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = UpdateProposalStatusSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { id: proposalId },
      select: { id: true, status: true },
    })
    if (!proposal) return { success: false, error: 'Proposal not found' }

    await prisma.trip_proposals.update({
      where: { id: proposalId },
      data: {
        status: v.status,
        updated_at: new Date(),
      },
    })

    await prisma.trip_proposal_activity.create({
      data: {
        trip_proposal_id: proposalId,
        action: `status_changed_to_${v.status}`,
        description: `Status changed from ${proposal.status} to ${v.status}`,
        actor_type: 'staff',
        actor_user_id: session.user.id ? session.user.id : null,
      },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update status'
    return { success: false, error: message }
  }
}

// ============================================================================
// createProposalAction — useActionState wrapper for FormData
// Collects separate firstName + lastName and combines into customer_name
// ============================================================================

export type CreateProposalActionResult = {
  success: boolean
  id?: number
  proposal_number?: string
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createProposalAction(
  _prev: CreateProposalActionResult | null,
  formData: FormData
): Promise<CreateProposalActionResult> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const firstName = (formData.get('firstName') as string)?.trim() || ''
  const lastName = (formData.get('lastName') as string)?.trim() || ''

  if (!firstName) {
    return { success: false, fieldErrors: { firstName: ['First name is required'] } }
  }
  if (!lastName) {
    return { success: false, fieldErrors: { lastName: ['Last name is required'] } }
  }

  const customerName = `${firstName} ${lastName}`

  const input = {
    customer_name: customerName,
    customer_email: (formData.get('customer_email') as string) || '',
    customer_phone: (formData.get('customer_phone') as string) || '',
    customer_company: (formData.get('customer_company') as string) || '',
    trip_type: (formData.get('trip_type') as string) || 'wine_tour',
    trip_title: (formData.get('trip_title') as string) || undefined,
    party_size: parseInt((formData.get('party_size') as string) || '2', 10),
    start_date: (formData.get('start_date') as string) || '',
    end_date: (formData.get('end_date') as string) || undefined,
    introduction: (formData.get('introduction') as string) || undefined,
    internal_notes: (formData.get('internal_notes') as string) || undefined,
    tax_rate: parseFloat((formData.get('tax_rate') as string) || '0.091'),
    deposit_percentage: parseInt((formData.get('deposit_percentage') as string) || '50', 10),
    gratuity_percentage: parseInt((formData.get('gratuity_percentage') as string) || '0', 10),
  }

  const result = await createProposal(input as CreateProposalInput)

  if (!result.success) {
    const err = result.error
    if (typeof err === 'object' && err !== null) {
      return { success: false, fieldErrors: err as Record<string, string[]> }
    }
    return { success: false, error: typeof err === 'string' ? err : 'Failed to create proposal' }
  }

  return {
    success: true,
    id: result.data?.id,
    proposal_number: result.data?.proposal_number,
  }
}
