'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type {
  EventWithCategory,
  EventListResult,
  EventCategory,
  EventTag,
  EventAnalyticsSummary,
  EventAnalyticsOverview,
  EventAnalyticsByEvent,
  EventAnalyticsByCoordinator,
  EventAnalyticsByCategory,
  EventAnalyticsBySource,
  EventAnalyticsDailyTrend,
  EventOrganizer,
  EventOrganizerWithUser,
  OrganizerDashboardData,
} from '@/lib/types/events'
import { EventFiltersSchema, type EventFiltersInput } from '@/lib/schemas/event'

// ============================================================================
// PUBLIC EVENT QUERIES (events table is @@ignore — raw SQL)
// ============================================================================

/**
 * List published events with filtering (public)
 */
export async function listPublishedEvents(filters: EventFiltersInput = {}): Promise<{
  success: boolean
  data?: EventListResult
  error?: string
}> {
  try {
    const parsed = EventFiltersSchema.safeParse(filters)
    const f = parsed.success ? parsed.data : {}

    const conditions: string[] = ["e.status = 'published'", 'e.start_date >= CURRENT_DATE']
    const params: unknown[] = []
    let paramIndex = 1

    if (f.category) {
      conditions.push(`ec.slug = $${paramIndex}`)
      params.push(f.category)
      paramIndex++
    }

    if (f.search) {
      conditions.push(
        `(e.title ILIKE $${paramIndex} OR e.short_description ILIKE $${paramIndex} OR e.venue_name ILIKE $${paramIndex})`
      )
      params.push(`%${f.search}%`)
      paramIndex++
    }

    if (f.startDate) {
      conditions.push(`e.start_date >= $${paramIndex}`)
      params.push(f.startDate)
      paramIndex++
    }

    if (f.endDate) {
      conditions.push(`e.start_date <= $${paramIndex}`)
      params.push(f.endDate)
      paramIndex++
    }

    if (f.isFree !== undefined) {
      conditions.push(`e.is_free = $${paramIndex}`)
      params.push(f.isFree)
      paramIndex++
    }

    if (f.isFeatured !== undefined) {
      conditions.push(`e.is_featured = $${paramIndex}`)
      params.push(f.isFeatured)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')
    const limit = f.limit || 20
    const offset = f.offset || 0

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(DISTINCT e.id) as count
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE ${whereClause}`,
      ...params
    )
    const total = Number(countResult[0]?.count || 0)

    const data = await prisma.$queryRawUnsafe<EventWithCategory[]>(
      `SELECT DISTINCT ON (e.is_featured, e.feature_priority, e.start_date, e.id)
              e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon,
              (SELECT ARRAY_AGG(et2.slug) FROM event_tag_assignments eta2 JOIN event_tags et2 ON et2.id = eta2.tag_id WHERE eta2.event_id = e.id) as event_tag_slugs
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE ${whereClause}
       ORDER BY e.is_featured DESC, e.feature_priority DESC, e.start_date ASC, e.id
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      ...params,
      limit,
      offset
    )

    return {
      success: true,
      data: {
        data,
        total,
        limit,
        offset,
        hasMore: offset + data.length < total,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events'
    return { success: false, error: message }
  }
}

/**
 * Get featured events (public)
 */
export async function getFeaturedEvents(limit: number = 4): Promise<{
  success: boolean
  data?: EventWithCategory[]
  error?: string
}> {
  try {
    const data = await prisma.$queryRawUnsafe<EventWithCategory[]>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon,
              (SELECT ARRAY_AGG(et.slug) FROM event_tag_assignments eta JOIN event_tags et ON et.id = eta.tag_id WHERE eta.event_id = e.id) as event_tag_slugs
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.status = 'published'
         AND e.is_featured = true
         AND e.start_date >= CURRENT_DATE
       ORDER BY e.feature_priority DESC, e.start_date ASC
       LIMIT $1`,
      limit
    )

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch featured events'
    return { success: false, error: message }
  }
}

/**
 * Get upcoming events (public)
 */
export async function getUpcomingEvents(limit: number = 10): Promise<{
  success: boolean
  data?: EventWithCategory[]
  error?: string
}> {
  try {
    const data = await prisma.$queryRawUnsafe<EventWithCategory[]>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon,
              (SELECT ARRAY_AGG(et.slug) FROM event_tag_assignments eta JOIN event_tags et ON et.id = eta.tag_id WHERE eta.event_id = e.id) as event_tag_slugs
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.status = 'published'
         AND e.start_date >= CURRENT_DATE
       ORDER BY e.start_date ASC, e.start_time ASC NULLS LAST
       LIMIT $1`,
      limit
    )

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch upcoming events'
    return { success: false, error: message }
  }
}

/**
 * Get single event by slug (public)
 */
export async function getEventBySlug(slug: string): Promise<{
  success: boolean
  data?: EventWithCategory
  error?: string
}> {
  try {
    const results = await prisma.$queryRawUnsafe<EventWithCategory[]>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon,
              (SELECT ARRAY_AGG(et.slug) FROM event_tag_assignments eta JOIN event_tags et ON et.id = eta.tag_id WHERE eta.event_id = e.id) as event_tag_slugs
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.slug = $1 AND e.status = 'published'`,
      slug
    )

    const event = results[0]
    if (!event) {
      return { success: false, error: 'Event not found' }
    }

    return { success: true, data: event }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch event'
    return { success: false, error: message }
  }
}

/**
 * Get events by category slug (public)
 */
export async function getEventsByCategory(
  categorySlug: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  success: boolean
  data?: EventListResult
  error?: string
}> {
  try {
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count
       FROM events e
       JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.status = 'published' AND e.start_date >= CURRENT_DATE AND ec.slug = $1`,
      categorySlug
    )
    const total = Number(countResult[0]?.count || 0)

    const data = await prisma.$queryRawUnsafe<EventWithCategory[]>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon
       FROM events e
       JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.status = 'published' AND e.start_date >= CURRENT_DATE AND ec.slug = $1
       ORDER BY e.start_date ASC
       LIMIT $2 OFFSET $3`,
      categorySlug,
      limit,
      offset
    )

    return {
      success: true,
      data: { data, total, limit, offset, hasMore: offset + data.length < total },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events by category'
    return { success: false, error: message }
  }
}

/**
 * Get all event categories
 */
export async function getEventCategories(): Promise<{
  success: boolean
  data?: EventCategory[]
  error?: string
}> {
  try {
    const data = await prisma.$queryRawUnsafe<EventCategory[]>(
      `SELECT * FROM event_categories WHERE is_active = true ORDER BY display_order ASC`
    )
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories'
    return { success: false, error: message }
  }
}

/**
 * Get all event tags
 */
export async function getEventTags(): Promise<{
  success: boolean
  data?: EventTag[]
  error?: string
}> {
  try {
    const data = await prisma.$queryRawUnsafe<EventTag[]>(
      `SELECT * FROM event_tags ORDER BY name ASC`
    )
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tags'
    return { success: false, error: message }
  }
}

// ============================================================================
// ADMIN EVENT QUERIES
// ============================================================================

/**
 * List all events for admin (any status)
 */
export async function listAllEvents(filters: EventFiltersInput = {}): Promise<{
  success: boolean
  data?: EventListResult
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const f = EventFiltersSchema.parse(filters)
    const conditions: string[] = ['1=1']
    const params: unknown[] = []
    let paramIndex = 1

    if (f.status) {
      conditions.push(`e.status = $${paramIndex}`)
      params.push(f.status)
      paramIndex++
    }

    if (f.category) {
      conditions.push(`ec.slug = $${paramIndex}`)
      params.push(f.category)
      paramIndex++
    }

    if (f.search) {
      conditions.push(`(e.title ILIKE $${paramIndex} OR e.short_description ILIKE $${paramIndex})`)
      params.push(`%${f.search}%`)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')
    const limit = f.limit || 50
    const offset = f.offset || 0

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE ${whereClause}`,
      ...params
    )
    const total = Number(countResult[0]?.count || 0)

    const data = await prisma.$queryRawUnsafe<EventWithCategory[]>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon,
              (SELECT ARRAY_AGG(et.slug) FROM event_tag_assignments eta JOIN event_tags et ON et.id = eta.tag_id WHERE eta.event_id = e.id) as event_tag_slugs
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      ...params,
      limit,
      offset
    )

    return {
      success: true,
      data: { data, total, limit, offset, hasMore: offset + data.length < total },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events'
    return { success: false, error: message }
  }
}

/**
 * Get event by ID (admin — any status)
 */
export async function getEventById(id: number): Promise<{
  success: boolean
  data?: EventWithCategory
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const results = await prisma.$queryRawUnsafe<EventWithCategory[]>(
      `SELECT e.*,
              ec.name as category_name,
              ec.slug as category_slug,
              ec.icon as category_icon,
              (SELECT ARRAY_AGG(et.slug) FROM event_tag_assignments eta JOIN event_tags et ON et.id = eta.tag_id WHERE eta.event_id = e.id) as event_tag_slugs
       FROM events e
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE e.id = $1`,
      id
    )

    const event = results[0]
    if (!event) {
      return { success: false, error: 'Event not found' }
    }

    return { success: true, data: event }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch event'
    return { success: false, error: message }
  }
}

// ============================================================================
// EVENT ANALYTICS QUERIES (event_analytics table — no Prisma model)
// ============================================================================

/**
 * Get analytics summary for a single event
 */
export async function getEventAnalyticsSummary(eventId: number): Promise<{
  success: boolean
  data?: EventAnalyticsSummary
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const result = await prisma.$queryRawUnsafe<
      [{ impressions: bigint; click_throughs: bigint }]
    >(
      `SELECT
        COUNT(*) FILTER (WHERE action = 'impression') as impressions,
        COUNT(*) FILTER (WHERE action = 'click_through') as click_throughs
       FROM event_analytics
       WHERE event_id = $1`,
      eventId
    )

    const impressions = Number(result[0]?.impressions || 0)
    const clickThroughs = Number(result[0]?.click_throughs || 0)

    return {
      success: true,
      data: {
        impressions,
        click_throughs: clickThroughs,
        click_through_rate:
          impressions > 0 ? Math.round((clickThroughs / impressions) * 10000) / 100 : 0,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics'
    return { success: false, error: message }
  }
}

/**
 * Get overview analytics with optional date range
 */
export async function getAnalyticsOverview(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean
  data?: EventAnalyticsOverview
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const conditions: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (startDate) {
      conditions.push(`ea.created_at >= $${idx}::timestamptz`)
      params.push(startDate)
      idx++
    }
    if (endDate) {
      conditions.push(`ea.created_at < ($${idx}::date + interval '1 day')`)
      params.push(endDate)
      idx++
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await prisma.$queryRawUnsafe<
      [{ impressions: bigint; click_throughs: bigint }]
    >(
      `SELECT
        COUNT(*) FILTER (WHERE ea.action = 'impression') as impressions,
        COUNT(*) FILTER (WHERE ea.action = 'click_through') as click_throughs
       FROM event_analytics ea
       ${where}`,
      ...params
    )

    const impressions = Number(result[0]?.impressions || 0)
    const clickThroughs = Number(result[0]?.click_throughs || 0)

    return {
      success: true,
      data: {
        impressions,
        click_throughs: clickThroughs,
        click_through_rate:
          impressions > 0 ? Math.round((clickThroughs / impressions) * 10000) / 100 : 0,
        traffic_facilitated: clickThroughs,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics overview'
    return { success: false, error: message }
  }
}

/**
 * Get daily trend data
 */
export async function getAnalyticsTrends(days: number = 30): Promise<{
  success: boolean
  data?: EventAnalyticsDailyTrend[]
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const data = await prisma.$queryRawUnsafe<EventAnalyticsDailyTrend[]>(
      `SELECT
        d::date::text as date,
        COALESCE(COUNT(*) FILTER (WHERE ea.action = 'impression'), 0)::int as impressions,
        COALESCE(COUNT(*) FILTER (WHERE ea.action = 'click_through'), 0)::int as click_throughs
       FROM generate_series(
         CURRENT_DATE - ($1 || ' days')::interval,
         CURRENT_DATE,
         '1 day'::interval
       ) d
       LEFT JOIN event_analytics ea ON ea.created_at::date = d::date
       GROUP BY d
       ORDER BY d ASC`,
      days
    )

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics trends'
    return { success: false, error: message }
  }
}

/**
 * Get per-event analytics breakdown
 */
export async function getAnalyticsByEvent(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean
  data?: EventAnalyticsByEvent[]
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const conditions: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (startDate) {
      conditions.push(`ea.created_at >= $${idx}::timestamptz`)
      params.push(startDate)
      idx++
    }
    if (endDate) {
      conditions.push(`ea.created_at < ($${idx}::date + interval '1 day')`)
      params.push(endDate)
      idx++
    }

    const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

    const data = await prisma.$queryRawUnsafe<EventAnalyticsByEvent[]>(
      `SELECT
        e.id as event_id,
        e.title as event_title,
        ec.name as category_name,
        e.start_date::text as event_date,
        COUNT(*) FILTER (WHERE ea.action = 'impression')::int as impressions,
        COUNT(*) FILTER (WHERE ea.action = 'click_through')::int as click_throughs,
        CASE
          WHEN COUNT(*) FILTER (WHERE ea.action = 'impression') > 0
          THEN ROUND(COUNT(*) FILTER (WHERE ea.action = 'click_through')::numeric /
               COUNT(*) FILTER (WHERE ea.action = 'impression') * 100, 2)::float
          ELSE 0
        END as click_through_rate
       FROM events e
       LEFT JOIN event_analytics ea ON ea.event_id = e.id ${where}
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE ea.id IS NOT NULL
       GROUP BY e.id, e.title, ec.name, e.start_date
       ORDER BY COUNT(*) FILTER (WHERE ea.action = 'impression') DESC
       LIMIT 100`,
      ...params
    )

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics by event'
    return { success: false, error: message }
  }
}

/**
 * Get per-coordinator analytics breakdown
 */
export async function getAnalyticsByCoordinator(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean
  data?: EventAnalyticsByCoordinator[]
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const conditions: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (startDate) {
      conditions.push(`ea.created_at >= $${idx}::timestamptz`)
      params.push(startDate)
      idx++
    }
    if (endDate) {
      conditions.push(`ea.created_at < ($${idx}::date + interval '1 day')`)
      params.push(endDate)
      idx++
    }

    const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

    const data = await prisma.$queryRawUnsafe<EventAnalyticsByCoordinator[]>(
      `SELECT
        COALESCE(eo.organization_name, e.organizer_name, 'Unknown') as coordinator_name,
        COUNT(DISTINCT e.id)::int as total_events,
        COUNT(*) FILTER (WHERE ea.action = 'impression')::int as impressions,
        COUNT(*) FILTER (WHERE ea.action = 'click_through')::int as click_throughs,
        CASE
          WHEN COUNT(*) FILTER (WHERE ea.action = 'impression') > 0
          THEN ROUND(COUNT(*) FILTER (WHERE ea.action = 'click_through')::numeric /
               COUNT(*) FILTER (WHERE ea.action = 'impression') * 100, 2)::float
          ELSE 0
        END as click_through_rate,
        COUNT(*) FILTER (WHERE ea.action = 'click_through')::int as traffic_value
       FROM events e
       LEFT JOIN event_analytics ea ON ea.event_id = e.id ${where}
       LEFT JOIN event_organizers eo ON e.organizer_id = eo.id
       WHERE ea.id IS NOT NULL
       GROUP BY COALESCE(eo.organization_name, e.organizer_name, 'Unknown')
       ORDER BY COUNT(*) FILTER (WHERE ea.action = 'impression') DESC`,
      ...params
    )

    return { success: true, data }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch analytics by coordinator'
    return { success: false, error: message }
  }
}

/**
 * Get per-category analytics breakdown
 */
export async function getAnalyticsByCategory(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean
  data?: EventAnalyticsByCategory[]
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const conditions: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (startDate) {
      conditions.push(`ea.created_at >= $${idx}::timestamptz`)
      params.push(startDate)
      idx++
    }
    if (endDate) {
      conditions.push(`ea.created_at < ($${idx}::date + interval '1 day')`)
      params.push(endDate)
      idx++
    }

    const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

    const data = await prisma.$queryRawUnsafe<EventAnalyticsByCategory[]>(
      `SELECT
        COALESCE(ec.name, 'Uncategorized') as category_name,
        COUNT(*) FILTER (WHERE ea.action = 'impression')::int as impressions,
        COUNT(*) FILTER (WHERE ea.action = 'click_through')::int as click_throughs,
        CASE
          WHEN COUNT(*) FILTER (WHERE ea.action = 'impression') > 0
          THEN ROUND(COUNT(*) FILTER (WHERE ea.action = 'click_through')::numeric /
               COUNT(*) FILTER (WHERE ea.action = 'impression') * 100, 2)::float
          ELSE 0
        END as click_through_rate
       FROM events e
       LEFT JOIN event_analytics ea ON ea.event_id = e.id ${where}
       LEFT JOIN event_categories ec ON e.category_id = ec.id
       WHERE ea.id IS NOT NULL
       GROUP BY ec.name
       ORDER BY COUNT(*) FILTER (WHERE ea.action = 'impression') DESC`,
      ...params
    )

    return { success: true, data }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch analytics by category'
    return { success: false, error: message }
  }
}

/**
 * Get per-source analytics breakdown
 */
export async function getAnalyticsBySource(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean
  data?: EventAnalyticsBySource[]
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const conditions: string[] = []
    const params: unknown[] = []
    let idx = 1

    if (startDate) {
      conditions.push(`ea.created_at >= $${idx}::timestamptz`)
      params.push(startDate)
      idx++
    }
    if (endDate) {
      conditions.push(`ea.created_at < ($${idx}::date + interval '1 day')`)
      params.push(endDate)
      idx++
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const data = await prisma.$queryRawUnsafe<EventAnalyticsBySource[]>(
      `SELECT
        COALESCE(ea.source, 'direct') as source,
        COUNT(*) FILTER (WHERE ea.action = 'impression')::int as impressions,
        COUNT(*) FILTER (WHERE ea.action = 'click_through')::int as click_throughs,
        CASE
          WHEN COUNT(*) FILTER (WHERE ea.action = 'impression') > 0
          THEN ROUND(COUNT(*) FILTER (WHERE ea.action = 'click_through')::numeric /
               COUNT(*) FILTER (WHERE ea.action = 'impression') * 100, 2)::float
          ELSE 0
        END as click_through_rate
       FROM event_analytics ea
       ${where}
       GROUP BY COALESCE(ea.source, 'direct')
       ORDER BY COUNT(*) DESC`,
      ...params
    )

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics by source'
    return { success: false, error: message }
  }
}

// ============================================================================
// ORGANIZER QUERIES (event_organizers — no Prisma model, raw SQL)
// ============================================================================

/**
 * Get all organizers (admin)
 */
export async function getAllOrganizers(): Promise<{
  success: boolean
  data?: EventOrganizerWithUser[]
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const data = await prisma.$queryRawUnsafe<EventOrganizerWithUser[]>(
      `SELECT eo.*, u.email as user_email, u.name as user_name
       FROM event_organizers eo
       JOIN users u ON eo.user_id = u.id
       ORDER BY eo.created_at DESC`
    )

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch organizers'
    return { success: false, error: message }
  }
}

/**
 * Get organizer by ID (admin)
 */
export async function getOrganizerById(id: number): Promise<{
  success: boolean
  data?: EventOrganizerWithUser
  error?: string
}> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const results = await prisma.$queryRawUnsafe<EventOrganizerWithUser[]>(
      `SELECT eo.*, u.email as user_email, u.name as user_name
       FROM event_organizers eo
       JOIN users u ON eo.user_id = u.id
       WHERE eo.id = $1`,
      id
    )

    const organizer = results[0]
    if (!organizer) {
      return { success: false, error: 'Organizer not found' }
    }

    return { success: true, data: organizer }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch organizer'
    return { success: false, error: message }
  }
}

/**
 * Get organizer profile by user ID (organizer portal)
 */
export async function getOrganizerByUserId(userId: number): Promise<{
  success: boolean
  data?: EventOrganizer
  error?: string
}> {
  try {
    const results = await prisma.$queryRawUnsafe<EventOrganizer[]>(
      `SELECT * FROM event_organizers WHERE user_id = $1`,
      userId
    )

    const organizer = results[0]
    if (!organizer) {
      return { success: false, error: 'Organizer profile not found' }
    }

    return { success: true, data: organizer }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch organizer profile'
    return { success: false, error: message }
  }
}

/**
 * Get organizer dashboard data
 */
export async function getOrganizerDashboard(userId: number): Promise<{
  success: boolean
  data?: OrganizerDashboardData
  error?: string
}> {
  try {
    const profileResults = await prisma.$queryRawUnsafe<EventOrganizer[]>(
      `SELECT * FROM event_organizers WHERE user_id = $1`,
      userId
    )

    const profile = profileResults[0]
    if (!profile) {
      return { success: false, error: 'Organizer profile not found' }
    }

    const statsResult = await prisma.$queryRawUnsafe<
      [
        {
          total_events: bigint
          published_events: bigint
          pending_events: bigint
          draft_events: bigint
          total_views: bigint
        },
      ]
    >(
      `SELECT
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'published') as published_events,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending_events,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_events,
        COALESCE(SUM(view_count), 0) as total_views
       FROM events
       WHERE organizer_id = $1`,
      profile.id
    )

    const upcomingResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count
       FROM events
       WHERE organizer_id = $1
         AND status = 'published'
         AND start_date >= CURRENT_DATE`,
      profile.id
    )

    return {
      success: true,
      data: {
        profile,
        stats: {
          total_events: Number(statsResult[0]?.total_events || 0),
          published_events: Number(statsResult[0]?.published_events || 0),
          pending_events: Number(statsResult[0]?.pending_events || 0),
          draft_events: Number(statsResult[0]?.draft_events || 0),
          total_views: Number(statsResult[0]?.total_views || 0),
          upcoming_events: Number(upcomingResult[0]?.count || 0),
        },
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch organizer dashboard'
    return { success: false, error: message }
  }
}

/**
 * Get organizer events
 */
export async function getOrganizerEvents(
  userId: number,
  status?: string
): Promise<{
  success: boolean
  data?: EventWithCategory[]
  error?: string
}> {
  try {
    const profileResults = await prisma.$queryRawUnsafe<EventOrganizer[]>(
      `SELECT * FROM event_organizers WHERE user_id = $1`,
      userId
    )

    const profile = profileResults[0]
    if (!profile) {
      return { success: false, error: 'Organizer profile not found' }
    }

    let sql = `
      SELECT e.*,
             ec.name as category_name,
             ec.slug as category_slug,
             ec.icon as category_icon
      FROM events e
      LEFT JOIN event_categories ec ON e.category_id = ec.id
      WHERE e.organizer_id = $1
    `
    const params: unknown[] = [profile.id]

    if (status) {
      sql += ` AND e.status = $2`
      params.push(status)
    }

    sql += ` ORDER BY e.created_at DESC`

    const data = await prisma.$queryRawUnsafe<EventWithCategory[]>(sql, ...params)

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch organizer events'
    return { success: false, error: message }
  }
}
