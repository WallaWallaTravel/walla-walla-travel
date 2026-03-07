'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  ProposalFiltersSchema,
  type ProposalFiltersInput,
} from '@/lib/schemas/trip-proposal'

// ============================================================================
// Types
// ============================================================================

export type ProposalListItem = {
  id: number
  proposal_number: string
  status: string | null
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  trip_type: string | null
  trip_title: string | null
  party_size: number
  start_date: Date
  end_date: Date | null
  total: string | number | null
  created_at: Date | null
  updated_at: Date | null
  brand: { id: number; brand_name: string; brand_code: string } | null
  _count: { trip_proposal_days: number; trip_proposal_guests: number }
}

export type ProposalListResult = {
  proposals: ProposalListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================================
// Auth helper
// ============================================================================

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return null
  }
  return session
}

// ============================================================================
// getProposals — list with pagination, status filter, search
// ============================================================================

export async function getProposals(
  filters?: ProposalFiltersInput
): Promise<{ success: boolean; data?: ProposalListResult; error?: string }> {
  const session = await requireAdmin()
  if (!session) return { success: false, error: 'Unauthorized' }

  const parsed = ProposalFiltersSchema.safeParse(filters || {})
  if (!parsed.success) {
    return { success: false, error: 'Invalid filters' }
  }

  const { status, search, page, limit } = parsed.data
  const skip = (page - 1) * limit

  try {
    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { customer_name: { contains: search, mode: 'insensitive' } },
        { customer_email: { contains: search, mode: 'insensitive' } },
        { proposal_number: { contains: search, mode: 'insensitive' } },
        { trip_title: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [proposals, total] = await Promise.all([
      prisma.trip_proposals.findMany({
        where,
        select: {
          id: true,
          proposal_number: true,
          status: true,
          customer_name: true,
          customer_email: true,
          customer_phone: true,
          trip_type: true,
          trip_title: true,
          party_size: true,
          start_date: true,
          end_date: true,
          total: true,
          created_at: true,
          updated_at: true,
          brands: {
            select: { id: true, brand_name: true, brand_code: true },
          },
          _count: {
            select: {
              trip_proposal_days: true,
              trip_proposal_guests: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trip_proposals.count({ where }),
    ])

    return {
      success: true,
      data: {
        proposals: proposals.map((p) => ({
          ...p,
          total: p.total ? Number(p.total) : null,
          brand: p.brands,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch proposals'
    return { success: false, error: message }
  }
}

// ============================================================================
// getProposalById — full proposal with all relations
// ============================================================================

export async function getProposalById(id: number) {
  const session = await requireAdmin()
  if (!session) return { success: false as const, error: 'Unauthorized' }

  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { id },
      include: {
        brands: {
          select: { id: true, brand_name: true, brand_code: true },
        },
        trip_proposal_days: {
          orderBy: { day_number: 'asc' },
          include: {
            trip_proposal_stops: {
              orderBy: { stop_order: 'asc' },
              include: {
                wineries: {
                  select: { id: true, name: true, city: true, slug: true },
                },
                restaurants: {
                  select: { id: true, name: true, cuisine_type: true, address: true },
                },
                hotels: {
                  select: { id: true, name: true, type: true, address: true },
                },
              },
            },
          },
        },
        trip_proposal_guests: {
          orderBy: [{ is_primary: 'desc' }, { name: 'asc' }],
        },
        trip_proposal_inclusions: {
          orderBy: { sort_order: 'asc' },
        },
        trip_proposal_activity: {
          orderBy: { created_at: 'desc' },
          take: 50,
        },
      },
    })

    if (!proposal) return { success: false as const, error: 'Proposal not found' }

    // Convert Decimal fields to numbers for serialization
    const serialized = {
      ...proposal,
      subtotal: Number(proposal.subtotal ?? 0),
      discount_amount: Number(proposal.discount_amount ?? 0),
      discount_percentage: Number(proposal.discount_percentage ?? 0),
      taxes: Number(proposal.taxes ?? 0),
      tax_rate: Number(proposal.tax_rate ?? 0.091),
      gratuity_amount: Number(proposal.gratuity_amount ?? 0),
      total: Number(proposal.total ?? 0),
      deposit_amount: Number(proposal.deposit_amount ?? 0),
      balance_due: Number(proposal.balance_due ?? 0),
      brand: proposal.brands,
      days: proposal.trip_proposal_days.map((day) => ({
        ...day,
        subtotal: Number(day.subtotal ?? 0),
        stops: day.trip_proposal_stops.map((stop) => ({
          ...stop,
          per_person_cost: Number(stop.per_person_cost ?? 0),
          flat_cost: Number(stop.flat_cost ?? 0),
          room_rate: Number(stop.room_rate ?? 0),
          winery: stop.wineries,
          restaurant: stop.restaurants,
          hotel: stop.hotels,
        })),
      })),
      guests: proposal.trip_proposal_guests,
      inclusions: proposal.trip_proposal_inclusions.map((inc) => ({
        ...inc,
        quantity: Number(inc.quantity ?? 1),
        unit_price: Number(inc.unit_price ?? 0),
        total_price: Number(inc.total_price ?? 0),
      })),
      activity: proposal.trip_proposal_activity,
    }

    return { success: true as const, data: serialized }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch proposal'
    return { success: false as const, error: message }
  }
}

// ============================================================================
// getProposalByNumber — for public view (no auth required)
// ============================================================================

export async function getProposalByNumber(proposalNumber: string) {
  try {
    const proposal = await prisma.trip_proposals.findUnique({
      where: { proposal_number: proposalNumber },
      include: {
        brands: {
          select: { id: true, brand_name: true, brand_code: true },
        },
        trip_proposal_days: {
          orderBy: { day_number: 'asc' },
          include: {
            trip_proposal_stops: {
              orderBy: { stop_order: 'asc' },
              include: {
                wineries: {
                  select: { id: true, name: true, city: true, slug: true },
                },
                restaurants: {
                  select: { id: true, name: true, cuisine_type: true, address: true },
                },
                hotels: {
                  select: { id: true, name: true, type: true, address: true },
                },
              },
            },
          },
        },
        trip_proposal_guests: {
          orderBy: [{ is_primary: 'desc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            is_primary: true,
            rsvp_status: true,
          },
        },
        trip_proposal_inclusions: {
          where: { show_on_proposal: true },
          orderBy: { sort_order: 'asc' },
        },
      },
    })

    if (!proposal) return { success: false as const, error: 'Proposal not found' }

    // Track view
    await prisma.trip_proposals.update({
      where: { id: proposal.id },
      data: {
        view_count: { increment: 1 },
        last_viewed_at: new Date(),
        first_viewed_at: proposal.first_viewed_at ?? new Date(),
        status: proposal.status === 'sent' ? 'viewed' : undefined,
      },
    })

    // Convert Decimal fields for serialization — exclude internal fields
    const serialized = {
      id: proposal.id,
      proposal_number: proposal.proposal_number,
      status: proposal.status,
      customer_name: proposal.customer_name,
      trip_type: proposal.trip_type,
      trip_title: proposal.trip_title,
      party_size: proposal.party_size,
      start_date: proposal.start_date,
      end_date: proposal.end_date,
      subtotal: Number(proposal.subtotal ?? 0),
      discount_amount: Number(proposal.discount_amount ?? 0),
      discount_percentage: Number(proposal.discount_percentage ?? 0),
      taxes: Number(proposal.taxes ?? 0),
      tax_rate: Number(proposal.tax_rate ?? 0.091),
      gratuity_percentage: proposal.gratuity_percentage,
      gratuity_amount: Number(proposal.gratuity_amount ?? 0),
      total: Number(proposal.total ?? 0),
      deposit_percentage: proposal.deposit_percentage,
      deposit_amount: Number(proposal.deposit_amount ?? 0),
      deposit_paid: proposal.deposit_paid,
      balance_due: Number(proposal.balance_due ?? 0),
      valid_until: proposal.valid_until,
      introduction: proposal.introduction,
      special_notes: proposal.special_notes,
      brand: proposal.brands,
      days: proposal.trip_proposal_days.map((day) => ({
        id: day.id,
        day_number: day.day_number,
        date: day.date,
        title: day.title,
        description: day.description,
        stops: day.trip_proposal_stops.map((stop) => ({
          id: stop.id,
          stop_order: stop.stop_order,
          stop_type: stop.stop_type,
          custom_name: stop.custom_name,
          custom_description: stop.custom_description,
          scheduled_time: stop.scheduled_time,
          duration_minutes: stop.duration_minutes,
          // Do NOT expose per-stop dollar amounts in client-facing view
          cost_note: stop.cost_note,
          client_notes: stop.client_notes,
          winery: stop.wineries,
          restaurant: stop.restaurants,
          hotel: stop.hotels,
        })),
      })),
      guests: proposal.trip_proposal_guests,
      inclusions: proposal.trip_proposal_inclusions.map((inc) => ({
        id: inc.id,
        inclusion_type: inc.inclusion_type,
        description: inc.description,
        quantity: Number(inc.quantity ?? 1),
        unit: inc.unit,
        unit_price: Number(inc.unit_price ?? 0),
        total_price: Number(inc.total_price ?? 0),
        sort_order: inc.sort_order,
      })),
    }

    return { success: true as const, data: serialized }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch proposal'
    return { success: false as const, error: message }
  }
}
