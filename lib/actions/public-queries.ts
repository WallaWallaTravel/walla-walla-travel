'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import {
  WineryFiltersSchema,
  SharedTourFiltersSchema,
  EventFiltersSchema,
  TripProposalAccessSchema,
  type WineryFilters,
  type PublicEventFilters,
} from '@/lib/schemas/public'

// ============================================================================
// WINERY QUERIES (Prisma — wineries model is NOT @@ignore)
// ============================================================================

/**
 * Get all active wineries for the public directory
 * Fetches only fields needed for listing display
 */
export async function getPublicWineries(filters?: WineryFilters) {
  const parsed = WineryFiltersSchema.parse(filters ?? {})

  const where: Prisma.wineriesWhereInput = {
    is_active: true,
  }

  if (parsed.search) {
    where.OR = [
      { name: { contains: parsed.search, mode: 'insensitive' } },
      { description: { contains: parsed.search, mode: 'insensitive' } },
      { city: { contains: parsed.search, mode: 'insensitive' } },
    ]
  }

  if (parsed.reservationRequired !== undefined) {
    where.reservation_required = parsed.reservationRequired
  }

  const [wineries, total] = await Promise.all([
    prisma.wineries.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        description: true,
        short_description: true,
        specialties: true,
        tasting_fee: true,
        reservation_required: true,
        average_rating: true,
        review_count: true,
        cover_photo_url: true,
        amenities: true,
        experience_tags: true,
        max_group_size: true,
        verified: true,
        is_featured: true,
        features: true,
      },
      orderBy: [
        { is_featured: 'desc' },
        { display_order: 'asc' },
        { name: 'asc' },
      ],
      take: parsed.limit,
      skip: parsed.offset,
    }),
    prisma.wineries.count({ where }),
  ])

  return { data: wineries, total }
}

/**
 * Get a single winery by slug for the detail page
 */
export async function getPublicWineryBySlug(slug: string) {
  const winery = await prisma.wineries.findFirst({
    where: {
      slug,
      is_active: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      short_description: true,
      founded_year: true,
      winemaker: true,
      owner: true,
      address: true,
      city: true,
      state: true,
      zip_code: true,
      latitude: true,
      longitude: true,
      phone: true,
      email: true,
      website: true,
      tasting_fee: true,
      tasting_fee_waived_with_purchase: true,
      minimum_purchase_for_waiver: true,
      reservation_required: true,
      accepts_walkins: true,
      average_visit_duration: true,
      specialties: true,
      production_volume: true,
      price_range: true,
      hours_of_operation: true,
      seasonal_hours: true,
      amenities: true,
      accessibility_features: true,
      cover_photo_url: true,
      photos: true,
      virtual_tour_url: true,
      video_url: true,
      average_rating: true,
      review_count: true,
      curator_notes: true,
      meta_title: true,
      meta_description: true,
      keywords: true,
      is_featured: true,
      experience_tags: true,
      min_group_size: true,
      max_group_size: true,
      booking_advance_days_min: true,
      booking_advance_days_max: true,
      cancellation_policy: true,
      pet_policy: true,
      verified: true,
      verified_at: true,
      features: true,
      walk_ins_welcome: true,
      ava: true,
      created_at: true,
      updated_at: true,
    },
  })

  return winery
}

/**
 * Get verified wineries for the directory
 */
export async function getPublicVerifiedWineries() {
  const wineries = await prisma.wineries.findMany({
    where: {
      is_active: true,
      verified: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      description: true,
      specialties: true,
      tasting_fee: true,
      reservation_required: true,
      average_rating: true,
      cover_photo_url: true,
      experience_tags: true,
      features: true,
      max_group_size: true,
      verified: true,
      amenities: true,
    },
    orderBy: [
      { is_featured: 'desc' },
      { display_order: 'asc' },
      { name: 'asc' },
    ],
  })

  return wineries
}

/**
 * Get all winery slugs for static generation
 */
export async function getAllPublicWinerySlugs(): Promise<string[]> {
  const wineries = await prisma.wineries.findMany({
    where: { is_active: true },
    select: { slug: true },
  })

  return wineries.map(w => w.slug)
}

// ============================================================================
// SHARED TOURS QUERIES (Raw SQL — shared_tours is @@ignore)
// ============================================================================

export interface PublicSharedTour {
  id: number
  tour_code: string
  tour_date: string
  start_time: string
  duration_hours: number
  title: string
  description: string | null
  max_guests: number
  min_guests: number
  price_per_person: number
  pickup_location: string | null
  planned_wineries: string[]
  lunch_included: boolean
  lunch_venue: string | null
  status: string
  published: boolean
  current_guests: number
  spots_available: number
  lunch_menu_options: unknown
}

/**
 * Get published upcoming shared tours
 */
export async function getPublicSharedTours(filters?: { startDate?: string; endDate?: string }) {
  const parsed = SharedTourFiltersSchema.parse(filters ?? {})

  let sql = `
    SELECT
      st.id,
      st.tour_code,
      st.tour_date::text,
      st.start_time::text,
      st.duration_hours,
      st.title,
      st.description,
      st.max_guests,
      COALESCE(st.min_guests, 2) as min_guests,
      st.price_per_person,
      st.pickup_location,
      st.planned_wineries,
      COALESCE(st.lunch_included, false) as lunch_included,
      st.lunch_venue,
      COALESCE(st.status, 'scheduled') as status,
      COALESCE(st.published, false) as published,
      COALESCE(st.current_guests, 0) as current_guests,
      (st.max_guests - COALESCE(st.current_guests, 0)) as spots_available,
      st.lunch_menu_options
    FROM shared_tours st
    WHERE COALESCE(st.published, false) = true
      AND st.tour_date >= CURRENT_DATE
  `

  const params: unknown[] = []
  let paramIdx = 1

  if (parsed.startDate) {
    sql += ` AND st.tour_date >= $${paramIdx}`
    params.push(parsed.startDate)
    paramIdx++
  }
  if (parsed.endDate) {
    sql += ` AND st.tour_date <= $${paramIdx}`
    params.push(parsed.endDate)
    paramIdx++
  }

  sql += ` ORDER BY st.tour_date ASC, st.start_time ASC`

  const result = await prisma.$queryRawUnsafe<PublicSharedTour[]>(sql, ...params)
  return result
}

/**
 * Get a single shared tour by ID
 */
export async function getPublicSharedTourById(tourId: number) {
  const result = await prisma.$queryRawUnsafe<PublicSharedTour[]>(
    `SELECT
      st.id,
      st.tour_code,
      st.tour_date::text,
      st.start_time::text,
      st.duration_hours,
      st.title,
      st.description,
      st.max_guests,
      COALESCE(st.min_guests, 2) as min_guests,
      st.price_per_person,
      st.pickup_location,
      st.planned_wineries,
      COALESCE(st.lunch_included, false) as lunch_included,
      st.lunch_venue,
      COALESCE(st.status, 'scheduled') as status,
      COALESCE(st.published, false) as published,
      COALESCE(st.current_guests, 0) as current_guests,
      (st.max_guests - COALESCE(st.current_guests, 0)) as spots_available,
      st.lunch_menu_options
    FROM shared_tours st
    WHERE st.id = $1
      AND COALESCE(st.published, false) = true`,
    tourId
  )

  return result.length > 0 ? result[0] : null
}

// ============================================================================
// EVENTS QUERIES (Raw SQL — events is @@ignore)
// ============================================================================

export interface PublicEvent {
  id: number
  title: string
  slug: string | null
  description: string | null
  short_description: string | null
  category: string | null
  category_name: string | null
  category_slug: string | null
  category_icon: string | null
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  is_all_day: boolean
  venue_name: string | null
  address: string | null
  is_virtual: boolean
  virtual_url: string | null
  price_info: string | null
  ticket_url: string | null
  image_url: string | null
  is_featured: boolean
  is_free: boolean
  tags: string[]
  event_tag_slugs: string[] | null
}

/**
 * Get published events with filtering, pagination
 */
export async function getPublicEvents(filters?: PublicEventFilters) {
  const parsed = EventFiltersSchema.parse(filters ?? {})

  const conditions: string[] = ["e.status = 'published'", 'e.start_date >= CURRENT_DATE']
  const params: unknown[] = []
  let paramIndex = 1

  if (parsed.category) {
    conditions.push(`ec.slug = $${paramIndex}`)
    params.push(parsed.category)
    paramIndex++
  }

  if (parsed.search) {
    conditions.push(
      `(e.title ILIKE $${paramIndex} OR e.short_description ILIKE $${paramIndex} OR e.venue_name ILIKE $${paramIndex})`
    )
    params.push(`%${parsed.search}%`)
    paramIndex++
  }

  if (parsed.startDate) {
    conditions.push(`e.start_date >= $${paramIndex}`)
    params.push(parsed.startDate)
    paramIndex++
  }

  if (parsed.endDate) {
    conditions.push(`e.start_date <= $${paramIndex}`)
    params.push(parsed.endDate)
    paramIndex++
  }

  if (parsed.isFree !== undefined) {
    conditions.push(`e.is_free = $${paramIndex}`)
    params.push(parsed.isFree)
    paramIndex++
  }

  let tagJoin = ''
  if (parsed.tags) {
    const tagSlugs = parsed.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    if (tagSlugs.length > 0) {
      tagJoin = `JOIN event_tag_assignments eta ON eta.event_id = e.id JOIN event_tags et ON et.id = eta.tag_id`
      conditions.push(`et.slug = ANY($${paramIndex})`)
      params.push(tagSlugs)
      paramIndex++
    }
  }

  const whereClause = conditions.join(' AND ')
  const limit = parsed.limit
  const offset = parsed.offset

  // Count
  const countResult = await prisma.$queryRawUnsafe<[{ count: string }]>(
    `SELECT COUNT(DISTINCT e.id)::text as count
     FROM events e
     LEFT JOIN event_categories ec ON e.category_id = ec.id
     ${tagJoin}
     WHERE ${whereClause}`,
    ...params
  )
  const total = parseInt(countResult[0]?.count ?? '0', 10)

  // Data
  const data = await prisma.$queryRawUnsafe<PublicEvent[]>(
    `SELECT DISTINCT ON (e.is_featured, e.feature_priority, e.start_date, e.id)
            e.id, e.title, e.slug, e.description, e.short_description,
            e.category, e.start_date::text, e.end_date::text,
            e.start_time::text, e.end_time::text,
            COALESCE(e.is_all_day, false) as is_all_day,
            e.venue_name, e.address,
            COALESCE(e.is_virtual, false) as is_virtual,
            e.virtual_url, e.price_info, e.ticket_url, e.image_url,
            COALESCE(e.is_featured, false) as is_featured,
            COALESCE(e.is_free, false) as is_free,
            COALESCE(e.tags, ARRAY[]::text[]) as tags,
            ec.name as category_name,
            ec.slug as category_slug,
            ec.icon as category_icon,
            (SELECT ARRAY_AGG(et2.slug) FROM event_tag_assignments eta2
             JOIN event_tags et2 ON et2.id = eta2.tag_id
             WHERE eta2.event_id = e.id) as event_tag_slugs
     FROM events e
     LEFT JOIN event_categories ec ON e.category_id = ec.id
     ${tagJoin}
     WHERE ${whereClause}
     ORDER BY e.is_featured DESC, e.feature_priority DESC, e.start_date ASC, e.id
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    ...params,
    limit,
    offset
  )

  return { data, total, limit, offset, hasMore: offset + data.length < total }
}

/**
 * Get featured events
 */
export async function getPublicFeaturedEvents(limit: number = 4) {
  return prisma.$queryRawUnsafe<PublicEvent[]>(
    `SELECT e.id, e.title, e.slug, e.description, e.short_description,
            e.category, e.start_date::text, e.end_date::text,
            e.start_time::text, e.end_time::text,
            COALESCE(e.is_all_day, false) as is_all_day,
            e.venue_name, e.address,
            COALESCE(e.is_virtual, false) as is_virtual,
            e.virtual_url, e.price_info, e.ticket_url, e.image_url,
            COALESCE(e.is_featured, false) as is_featured,
            COALESCE(e.is_free, false) as is_free,
            COALESCE(e.tags, ARRAY[]::text[]) as tags,
            ec.name as category_name,
            ec.slug as category_slug,
            ec.icon as category_icon,
            (SELECT ARRAY_AGG(et.slug) FROM event_tag_assignments eta
             JOIN event_tags et ON et.id = eta.tag_id
             WHERE eta.event_id = e.id) as event_tag_slugs
     FROM events e
     LEFT JOIN event_categories ec ON e.category_id = ec.id
     WHERE e.status = 'published'
       AND e.is_featured = true
       AND e.start_date >= CURRENT_DATE
     ORDER BY e.feature_priority DESC, e.start_date ASC
     LIMIT $1`,
    limit
  )
}

/**
 * Get event categories with counts
 */
export async function getPublicEventCategories() {
  return prisma.$queryRawUnsafe<
    Array<{ id: number; name: string; slug: string; icon: string | null; event_count: string }>
  >(
    `SELECT ec.id, ec.name, ec.slug, ec.icon,
            COUNT(e.id)::text as event_count
     FROM event_categories ec
     LEFT JOIN events e ON e.category_id = ec.id
       AND e.status = 'published'
       AND e.start_date >= CURRENT_DATE
     GROUP BY ec.id, ec.name, ec.slug, ec.icon
     HAVING COUNT(e.id) > 0
     ORDER BY ec.display_order, ec.name`
  )
}

/**
 * Get all event tags
 */
export async function getPublicEventTags() {
  return prisma.$queryRawUnsafe<Array<{ id: number; name: string; slug: string }>>(
    `SELECT et.id, et.name, et.slug
     FROM event_tags et
     JOIN event_tag_assignments eta ON eta.tag_id = et.id
     JOIN events e ON e.id = eta.event_id
       AND e.status = 'published'
       AND e.start_date >= CURRENT_DATE
     GROUP BY et.id, et.name, et.slug
     ORDER BY COUNT(eta.event_id) DESC`
  )
}

/**
 * Get single event by slug
 */
export async function getPublicEventBySlug(slug: string) {
  const result = await prisma.$queryRawUnsafe<PublicEvent[]>(
    `SELECT e.id, e.title, e.slug, e.description, e.short_description,
            e.category, e.start_date::text, e.end_date::text,
            e.start_time::text, e.end_time::text,
            COALESCE(e.is_all_day, false) as is_all_day,
            e.venue_name, e.address,
            COALESCE(e.is_virtual, false) as is_virtual,
            e.virtual_url, e.price_info, e.ticket_url, e.image_url,
            COALESCE(e.is_featured, false) as is_featured,
            COALESCE(e.is_free, false) as is_free,
            COALESCE(e.tags, ARRAY[]::text[]) as tags,
            ec.name as category_name,
            ec.slug as category_slug,
            ec.icon as category_icon,
            (SELECT ARRAY_AGG(et.slug) FROM event_tag_assignments eta
             JOIN event_tags et ON et.id = eta.tag_id
             WHERE eta.event_id = e.id) as event_tag_slugs
     FROM events e
     LEFT JOIN event_categories ec ON e.category_id = ec.id
     WHERE e.slug = $1
       AND e.status = 'published'`,
    slug
  )

  return result.length > 0 ? result[0] : null
}

// ============================================================================
// TRIP PROPOSAL QUERIES (Prisma — trip_proposals is NOT @@ignore)
// ============================================================================

/**
 * Get a trip proposal by its proposal number for public viewing
 * Only returns sent/viewed/accepted proposals
 */
export async function getPublicTripProposal(proposalNumber: string) {
  const parsed = TripProposalAccessSchema.parse({ proposalNumber })

  if (!parsed.proposalNumber.startsWith('TP-')) {
    return null
  }

  const proposal = await prisma.trip_proposals.findUnique({
    where: { proposal_number: parsed.proposalNumber },
    select: {
      id: true,
      proposal_number: true,
      status: true,
      brand_id: true,
      customer_name: true,
      customer_email: true,
      customer_phone: true,
      trip_type: true,
      trip_title: true,
      party_size: true,
      start_date: true,
      end_date: true,
      introduction: true,
      special_notes: true,
      valid_until: true,
      deposit_percentage: true,
      gratuity_percentage: true,
      gratuity_amount: true,
      tax_rate: true,
      discount_amount: true,
      discount_percentage: true,
      discount_reason: true,
      subtotal: true,
      taxes: true,
      total: true,
      deposit_amount: true,
      deposit_paid: true,
      accepted_at: true,
      view_count: true,
      created_at: true,
      // Relations
      trip_proposal_days: {
        select: {
          id: true,
          day_number: true,
          date: true,
          title: true,
          description: true,
          notes: true,
          trip_proposal_stops: {
            select: {
              id: true,
              stop_order: true,
              stop_type: true,
              winery_id: true,
              restaurant_id: true,
              hotel_id: true,
              custom_name: true,
              custom_address: true,
              custom_description: true,
              scheduled_time: true,
              duration_minutes: true,
              cost_note: true,
              client_notes: true,
              wineries: {
                select: { id: true, name: true, cover_photo_url: true },
              },
              restaurants: {
                select: { id: true, name: true },
              },
              hotels: {
                select: { id: true, name: true },
              },
            },
            orderBy: { stop_order: 'asc' },
          },
        },
        orderBy: { day_number: 'asc' },
      },
      trip_proposal_guests: {
        select: {
          id: true,
          name: true,
          email: true,
          dietary_restrictions: true,
          is_primary: true,
        },
        orderBy: [{ is_primary: 'desc' }, { name: 'asc' }],
      },
      trip_proposal_inclusions: {
        where: { show_on_proposal: true },
        select: {
          id: true,
          inclusion_type: true,
          description: true,
          quantity: true,
          unit_price: true,
          total_price: true,
          sort_order: true,
          notes: true,
        },
        orderBy: { sort_order: 'asc' },
      },
    },
  })

  if (!proposal) return null

  // Only allow viewing of sent/viewed/accepted proposals
  if (!['sent', 'viewed', 'accepted'].includes(proposal.status ?? '')) {
    return null
  }

  return proposal
}

/**
 * Record a view on a trip proposal (increment view count, update status if needed)
 */
export async function recordTripProposalView(proposalId: number, status: string | null, ip: string) {
  if (status === 'sent') {
    // Mark as viewed
    await prisma.trip_proposals.update({
      where: { id: proposalId },
      data: {
        status: 'viewed',
        first_viewed_at: new Date(),
        last_viewed_at: new Date(),
        view_count: { increment: 1 },
      },
    })

    // Log activity
    await prisma.trip_proposal_activity.create({
      data: {
        trip_proposal_id: proposalId,
        action: 'viewed',
        description: 'Proposal viewed by customer',
        actor_type: 'customer',
        ip_address: ip,
      },
    })
  } else if (status === 'viewed') {
    // Just increment view count
    await prisma.trip_proposals.update({
      where: { id: proposalId },
      data: {
        view_count: { increment: 1 },
        last_viewed_at: new Date(),
      },
    })
  }
}
