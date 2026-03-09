'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

// ============================================================================
// TYPES
// ============================================================================

export type PartnerProfileListItem = {
  id: number
  user_id: number
  business_name: string
  business_type: string
  winery_id: number | null
  hotel_id: number | null
  restaurant_id: number | null
  status: string
  invited_by: number | null
  invited_at: Date | null
  setup_completed_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
  user_email: string
  user_name: string
}

export type PartnerDashboardData = {
  profile: {
    id: number
    user_id: number
    business_name: string
    business_type: string
    winery_id: number | null
    hotel_id: number | null
    restaurant_id: number | null
    status: string
    setup_completed_at: Date | null
    updated_at: Date
  } | null
  stats: {
    profile_completion: number
    total_views: number
    ai_recommendations: number
    last_updated: Date | null
    content_completion: {
      stories_completed: number
      stories_total: number
      tips_count: number
    }
  }
}

// ============================================================================
// ADMIN QUERIES
// ============================================================================

/**
 * Get all partner profiles (admin)
 */
export async function getAllPartners(): Promise<{
  success: boolean
  data?: PartnerProfileListItem[]
  error?: string
}> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // No Prisma relation between partner_profiles and users, use raw SQL join
    const data = await prisma.$queryRawUnsafe<PartnerProfileListItem[]>(
      `SELECT pp.*, u.email as user_email, u.name as user_name
       FROM partner_profiles pp
       JOIN users u ON pp.user_id = u.id
       ORDER BY pp.created_at DESC`
    )

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch partners'
    return { success: false, error: message }
  }
}

/**
 * Get a single partner profile by ID (admin)
 */
export async function getPartnerById(id: number): Promise<{
  success: boolean
  data?: PartnerProfileListItem
  error?: string
}> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const results = await prisma.$queryRawUnsafe<PartnerProfileListItem[]>(
      `SELECT pp.*, u.email as user_email, u.name as user_name
       FROM partner_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.id = $1`,
      id
    )

    const profile = results[0]
    if (!profile) {
      return { success: false, error: 'Partner not found' }
    }

    return {
      success: true,
      data: profile,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch partner'
    return { success: false, error: message }
  }
}

/**
 * Get partner profile by user ID (for partner portal)
 */
export async function getPartnerProfileByUserId(userId: number): Promise<{
  success: boolean
  data?: PartnerDashboardData
  error?: string
}> {
  try {
    const profile = await prisma.partner_profiles.findFirst({
      where: { user_id: userId },
    })

    // Calculate profile completion
    let profileCompletion = 0
    if (profile) {
      profileCompletion = 20
      if (profile.setup_completed_at) profileCompletion += 30
      if (profile.winery_id || profile.hotel_id || profile.restaurant_id) profileCompletion += 30
    }

    // Get content stats using raw SQL for @@ignore tables
    let storiesCompleted = 0
    let tipsCount = 0
    const storyContentTypes = ['origin_story', 'philosophy', 'unique_story']
    const storiesTotal = storyContentTypes.length

    if (profile?.winery_id) {
      const storiesResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(DISTINCT content_type) as count
         FROM winery_content
         WHERE winery_id = $1
           AND content_type = ANY($2)
           AND LENGTH(content) >= 100`,
        profile.winery_id,
        storyContentTypes
      )
      storiesCompleted = Number(storiesResult[0]?.count || 0)

      // winery_insider_tips is NOT @@ignore, use Prisma
      tipsCount = await prisma.winery_insider_tips.count({
        where: { winery_id: profile.winery_id },
      })
    }

    return {
      success: true,
      data: {
        profile: profile
          ? {
              id: profile.id,
              user_id: profile.user_id,
              business_name: profile.business_name,
              business_type: profile.business_type,
              winery_id: profile.winery_id,
              hotel_id: profile.hotel_id,
              restaurant_id: profile.restaurant_id,
              status: profile.status,
              setup_completed_at: profile.setup_completed_at,
              updated_at: profile.updated_at,
            }
          : null,
        stats: {
          profile_completion: profileCompletion,
          total_views: 0,
          ai_recommendations: 0,
          last_updated: profile?.updated_at || null,
          content_completion: {
            stories_completed: storiesCompleted,
            stories_total: storiesTotal,
            tips_count: tipsCount,
          },
        },
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch partner profile'
    return { success: false, error: message }
  }
}

// ============================================================================
// HOTEL PARTNER QUERIES
// ============================================================================

export type HotelPartnerListItem = {
  id: number
  name: string
  contact_name: string | null
  email: string
  phone: string | null
  address: string | null
  invite_token: string | null
  invite_sent_at: Date | null
  registered_at: Date | null
  is_active: boolean | null
  commission_rate: number | null
  commission_type: string | null
  notes: string | null
  created_at: Date | null
  updated_at: Date | null
}

/**
 * List all hotel partners (admin)
 */
export async function listHotelPartners(activeOnly: boolean = false): Promise<{
  success: boolean
  data?: HotelPartnerListItem[]
  error?: string
}> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const where = activeOnly ? { is_active: true } : {}
    const hotels = await prisma.hotel_partners.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    const data: HotelPartnerListItem[] = hotels.map((h) => ({
      id: h.id,
      name: h.name,
      contact_name: h.contact_name,
      email: h.email,
      phone: h.phone,
      address: h.address,
      invite_token: h.invite_token,
      invite_sent_at: h.invite_sent_at,
      registered_at: h.registered_at,
      is_active: h.is_active,
      commission_rate: h.commission_rate ? Number(h.commission_rate) : null,
      commission_type: h.commission_type,
      notes: h.notes,
      created_at: h.created_at,
      updated_at: h.updated_at,
    }))

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch hotel partners'
    return { success: false, error: message }
  }
}

/**
 * Get a hotel partner by ID
 */
export async function getHotelPartnerById(id: number): Promise<{
  success: boolean
  data?: HotelPartnerListItem
  error?: string
}> {
  try {
    const hotel = await prisma.hotel_partners.findUnique({
      where: { id },
    })

    if (!hotel) {
      return { success: false, error: 'Hotel partner not found' }
    }

    return {
      success: true,
      data: {
        id: hotel.id,
        name: hotel.name,
        contact_name: hotel.contact_name,
        email: hotel.email,
        phone: hotel.phone,
        address: hotel.address,
        invite_token: hotel.invite_token,
        invite_sent_at: hotel.invite_sent_at,
        registered_at: hotel.registered_at,
        is_active: hotel.is_active,
        commission_rate: hotel.commission_rate ? Number(hotel.commission_rate) : null,
        commission_type: hotel.commission_type,
        notes: hotel.notes,
        created_at: hotel.created_at,
        updated_at: hotel.updated_at,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch hotel partner'
    return { success: false, error: message }
  }
}

/**
 * Get hotel partner stats (admin)
 */
export async function getHotelPartnerStats(hotelId?: number): Promise<{
  success: boolean
  data?: Array<{
    id: number
    name: string
    total_bookings: number
    total_guests: number
    total_revenue: number
    pending_payments: number
  }>
  error?: string
}> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const whereClause = hotelId ? 'WHERE hp.id = $1' : ''
    const params = hotelId ? [hotelId] : []

    const result = await prisma.$queryRawUnsafe<
      Array<{
        id: number
        name: string
        total_bookings: bigint
        total_guests: bigint
        total_revenue: string
        pending_payments: bigint
      }>
    >(
      `SELECT
        hp.id,
        hp.name,
        COUNT(t.id) AS total_bookings,
        COALESCE(SUM(t.guest_count), 0) AS total_guests,
        COALESCE(SUM(CASE WHEN t.payment_status = 'paid' THEN t.total_price * 1.089 ELSE 0 END), 0)::TEXT AS total_revenue,
        COUNT(t.id) FILTER (WHERE t.payment_status = 'pending') AS pending_payments
      FROM hotel_partners hp
      LEFT JOIN shared_tours_tickets t ON t.hotel_partner_id = hp.id AND t.status != 'cancelled'
      ${whereClause}
      GROUP BY hp.id, hp.name
      ORDER BY COUNT(t.id) DESC`,
      ...params
    )

    return {
      success: true,
      data: result.map((r) => ({
        id: r.id,
        name: r.name,
        total_bookings: Number(r.total_bookings),
        total_guests: Number(r.total_guests),
        total_revenue: parseFloat(r.total_revenue),
        pending_payments: Number(r.pending_payments),
      })),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch hotel stats'
    return { success: false, error: message }
  }
}
