'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  CreateEventSchema,
  UpdateEventSchema,
  CreateOrganizerInvitationSchema,
  UpdateOrganizerProfileSchema,
  UpdateOrganizerStatusSchema,
  CreateEventTagSchema,
  type CreateEventInput,
  type UpdateEventInput,
  type CreateOrganizerInvitationInput,
  type UpdateOrganizerProfileInput,
  type UpdateOrganizerStatusInput,
  type CreateEventTagInput,
} from '@/lib/schemas/event'
import type { EventOrganizer } from '@/lib/types/events'
import crypto from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export type EventActionResult = {
  success: boolean
  data?: Record<string, unknown>
  error?: string | Record<string, string[]>
}

// ============================================================================
// SLUG GENERATION
// ============================================================================

async function generateEventSlug(title: string): Promise<string> {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200)

  const existing = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) as count FROM events WHERE slug = $1`,
    slug
  )

  if (Number(existing[0]?.count || 0) > 0) {
    const suffix = Date.now().toString(36).slice(-4)
    slug = `${slug}-${suffix}`
  }

  return slug
}

// ============================================================================
// ADMIN EVENT MUTATIONS (events is @@ignore — raw SQL)
// ============================================================================

/**
 * Create a new event (admin)
 */
export async function createEvent(data: CreateEventInput): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateEventSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const slug = await generateEventSlug(v.title)

    const result = await prisma.$queryRawUnsafe<[{ id: number }]>(
      `INSERT INTO events (
        title, slug, short_description, description, category_id, tags,
        start_date, end_date, start_time, end_time, is_all_day,
        venue_name, address, city, state, zip,
        featured_image_url, gallery_urls,
        is_free, price_min, price_max, ticket_url,
        organizer_name, organizer_website, organizer_email, organizer_phone,
        is_featured, feature_priority,
        meta_title, meta_description, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28,
        $29, $30, 'draft', $31
      ) RETURNING id`,
      v.title,
      slug,
      v.short_description || null,
      v.description,
      v.category_id || null,
      v.tags || null,
      v.start_date,
      v.end_date || null,
      v.start_time || null,
      v.end_time || null,
      v.is_all_day || false,
      v.venue_name || null,
      v.address || null,
      v.city || 'Walla Walla',
      v.state || 'WA',
      v.zip || null,
      v.featured_image_url || null,
      v.gallery_urls || null,
      v.is_free ?? true,
      v.price_min || null,
      v.price_max || null,
      v.ticket_url || null,
      v.organizer_name || null,
      v.organizer_website || null,
      v.organizer_email || null,
      v.organizer_phone || null,
      v.is_featured || false,
      v.feature_priority || 0,
      v.meta_title || v.title,
      v.meta_description || v.short_description || null,
      parseInt(session.user.id!)
    )

    const eventId = result[0]?.id

    // Handle tag assignments
    if (v.tag_ids && v.tag_ids.length > 0 && eventId) {
      const values = v.tag_ids.map((tagId, i) => `($1, $${i + 2})`).join(', ')
      await prisma.$queryRawUnsafe(
        `INSERT INTO event_tag_assignments (event_id, tag_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        eventId,
        ...v.tag_ids
      )
    }

    return {
      success: true,
      data: { id: eventId, slug },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create event'
    return { success: false, error: message }
  }
}

/**
 * Update an event (admin)
 */
export async function updateEvent(id: number, data: UpdateEventInput): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = UpdateEventSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    // Build dynamic update
    const allowedFields = [
      'title',
      'short_description',
      'description',
      'category_id',
      'tags',
      'start_date',
      'end_date',
      'start_time',
      'end_time',
      'is_all_day',
      'venue_name',
      'address',
      'city',
      'state',
      'zip',
      'featured_image_url',
      'gallery_urls',
      'is_free',
      'price_min',
      'price_max',
      'ticket_url',
      'organizer_name',
      'organizer_website',
      'organizer_email',
      'organizer_phone',
      'is_featured',
      'feature_priority',
      'meta_title',
      'meta_description',
      'status',
    ]

    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      const value = v[field as keyof typeof v]
      if (value !== undefined) {
        updates.push(`${field} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    // Handle tag assignments
    if (v.tag_ids !== undefined) {
      await prisma.$queryRawUnsafe(
        `DELETE FROM event_tag_assignments WHERE event_id = $1`,
        id
      )
      if (v.tag_ids && v.tag_ids.length > 0) {
        const tagValues = v.tag_ids.map((tagId, i) => `($1, $${i + 2})`).join(', ')
        await prisma.$queryRawUnsafe(
          `INSERT INTO event_tag_assignments (event_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
          id,
          ...v.tag_ids
        )
      }
    }

    if (updates.length === 0) {
      return { success: true, data: { id } }
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    await prisma.$queryRawUnsafe(
      `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      ...values
    )

    return { success: true, data: { id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update event'
    return { success: false, error: message }
  }
}

/**
 * Publish an event (admin)
 */
export async function publishEvent(id: number): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await prisma.$queryRawUnsafe(
      `UPDATE events SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = $1`,
      id
    )
    return { success: true, data: { id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to publish event'
    return { success: false, error: message }
  }
}

/**
 * Cancel an event (admin)
 */
export async function cancelEvent(id: number): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await prisma.$queryRawUnsafe(
      `UPDATE events SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      id
    )
    return { success: true, data: { id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel event'
    return { success: false, error: message }
  }
}

/**
 * Delete an event (admin)
 */
export async function deleteEvent(id: number): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Delete tag assignments first
    await prisma.$queryRawUnsafe(
      `DELETE FROM event_tag_assignments WHERE event_id = $1`,
      id
    )
    // Delete analytics
    await prisma.$queryRawUnsafe(
      `DELETE FROM event_analytics WHERE event_id = $1`,
      id
    )
    // Delete event
    await prisma.$queryRawUnsafe(`DELETE FROM events WHERE id = $1`, id)
    return { success: true, data: { id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete event'
    return { success: false, error: message }
  }
}

// ============================================================================
// EVENT TAG MUTATIONS
// ============================================================================

/**
 * Create an event tag (admin)
 */
export async function createEventTag(data: CreateEventTagInput): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateEventTagSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const result = await prisma.$queryRawUnsafe<[{ id: number }]>(
      `INSERT INTO event_tags (name, slug) VALUES ($1, $2) RETURNING id`,
      parsed.data.name,
      parsed.data.slug
    )
    return { success: true, data: { id: result[0]?.id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create tag'
    return { success: false, error: message }
  }
}

/**
 * Delete an event tag (admin)
 */
export async function deleteEventTag(id: number): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await prisma.$queryRawUnsafe(
      `DELETE FROM event_tag_assignments WHERE tag_id = $1`,
      id
    )
    await prisma.$queryRawUnsafe(`DELETE FROM event_tags WHERE id = $1`, id)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete tag'
    return { success: false, error: message }
  }
}

// ============================================================================
// ORGANIZER MUTATIONS (event_organizers — no Prisma model, raw SQL)
// ============================================================================

/**
 * Create organizer invitation (admin)
 */
export async function createOrganizerInvitation(
  data: CreateOrganizerInvitationInput
): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateOrganizerInvitationSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    // Check if email already exists
    const existingUser = await prisma.users.findFirst({
      where: { email: v.contact_email.toLowerCase() },
    })

    if (existingUser) {
      return { success: false, error: 'A user with this email already exists' }
    }

    const setupToken = crypto.randomBytes(32).toString('hex')
    const setupExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const tempPassword = crypto.randomBytes(16).toString('hex')

    // Create user
    const user = await prisma.users.create({
      data: {
        email: v.contact_email.toLowerCase(),
        name: v.contact_name,
        password_hash: tempPassword,
        role: 'organizer',
        is_active: true,
      },
    })

    // Create organizer profile (no Prisma model — raw SQL)
    const organizerResult = await prisma.$queryRawUnsafe<[{ id: number }]>(
      `INSERT INTO event_organizers (
        user_id, organization_name, contact_name, contact_email, contact_phone,
        website, status, invited_by, invited_at, setup_token, setup_token_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), $8, $9)
      RETURNING id`,
      user.id,
      v.organization_name,
      v.contact_name,
      v.contact_email.toLowerCase(),
      v.contact_phone || null,
      v.website || null,
      parseInt(session.user.id!),
      setupToken,
      setupExpires
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const setupUrl = `${appUrl}/organizer-setup?token=${setupToken}`

    return {
      success: true,
      data: {
        organizer_id: organizerResult[0]?.id,
        setup_token: setupToken,
        setup_url: setupUrl,
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create organizer invitation'
    return { success: false, error: message }
  }
}

/**
 * Update organizer profile (organizer portal)
 */
export async function updateOrganizerProfile(
  userId: number,
  data: UpdateOrganizerProfileInput
): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Organizers can only update their own profile
  if (session.user.role === 'organizer' && parseInt(session.user.id!) !== userId) {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = UpdateOrganizerProfileSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const allowedFields = [
      'organization_name',
      'contact_name',
      'contact_phone',
      'website',
      'description',
      'logo_url',
    ]
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    for (const field of allowedFields) {
      const value = v[field as keyof typeof v]
      if (value !== undefined) {
        updates.push(`${field} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    if (updates.length === 0) {
      return { success: true }
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(userId)

    await prisma.$queryRawUnsafe(
      `UPDATE event_organizers SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
      ...values
    )

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update organizer profile'
    return { success: false, error: message }
  }
}

/**
 * Update organizer status (admin)
 */
export async function updateOrganizerStatus(
  id: number,
  data: UpdateOrganizerStatusInput
): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = UpdateOrganizerStatusSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (v.status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(v.status)
      paramIndex++
    }
    if (v.trust_level !== undefined) {
      updates.push(`trust_level = $${paramIndex}`)
      values.push(v.trust_level)
      paramIndex++
      // Auto-approve for trusted organizers
      if (v.trust_level === 'trusted' && v.auto_approve === undefined) {
        updates.push(`auto_approve = true`)
      }
    }
    if (v.auto_approve !== undefined) {
      updates.push(`auto_approve = $${paramIndex}`)
      values.push(v.auto_approve)
      paramIndex++
    }

    if (updates.length === 0) {
      return { success: true }
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    await prisma.$queryRawUnsafe(
      `UPDATE event_organizers SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      ...values
    )

    return { success: true, data: { id } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update organizer status'
    return { success: false, error: message }
  }
}

/**
 * Create event as organizer
 */
export async function createEventAsOrganizer(
  userId: number,
  data: CreateEventInput
): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Organizers can only create events for themselves
  if (session.user.role === 'organizer' && parseInt(session.user.id!) !== userId) {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateEventSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    // Get organizer profile
    const profileResults = await prisma.$queryRawUnsafe<EventOrganizer[]>(
      `SELECT * FROM event_organizers WHERE user_id = $1`,
      userId
    )
    const profile = profileResults[0]

    if (!profile) {
      return { success: false, error: 'Organizer profile not found' }
    }
    if (profile.status !== 'active') {
      return { success: false, error: 'Your organizer account is not active' }
    }

    // Use the existing eventsService for the heavy lifting (recurring events, slug, etc.)
    const { eventsService } = await import('@/lib/services/events.service')
    const v = parsed.data

    const eventData = {
      ...v,
      organizer_name: profile.organization_name,
      organizer_email: profile.contact_email,
      organizer_phone: profile.contact_phone,
      organizer_website: profile.website,
    }

    // Handle recurring events
    if (v.is_recurring && v.recurrence_rule) {
      const result = await eventsService.createRecurringEvent(eventData, userId)
      const targetStatus = profile.auto_approve ? 'published' : 'draft'

      await prisma.$queryRawUnsafe(
        `UPDATE events SET organizer_id = $1 WHERE id = $2 OR parent_event_id = $2`,
        profile.id,
        result.parent.id
      )

      if (profile.auto_approve) {
        await prisma.$queryRawUnsafe(
          `UPDATE events SET status = 'published', published_at = NOW()
           WHERE parent_event_id = $1 AND start_date >= CURRENT_DATE`,
          result.parent.id
        )
      }

      return {
        success: true,
        data: { id: result.parent.id, status: targetStatus },
      }
    }

    const event = await eventsService.create(eventData, userId)

    await prisma.$queryRawUnsafe(
      `UPDATE events SET organizer_id = $1, status = $2 WHERE id = $3`,
      profile.id,
      profile.auto_approve ? 'published' : event.status,
      event.id
    )

    return {
      success: true,
      data: {
        id: event.id,
        status: profile.auto_approve ? 'published' : event.status,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create event'
    return { success: false, error: message }
  }
}

/**
 * Submit event for review (organizer)
 */
export async function submitEventForReview(
  userId: number,
  eventId: number
): Promise<EventActionResult> {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  if (session.user.role === 'organizer' && parseInt(session.user.id!) !== userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const profileResults = await prisma.$queryRawUnsafe<EventOrganizer[]>(
      `SELECT * FROM event_organizers WHERE user_id = $1`,
      userId
    )
    const profile = profileResults[0]

    if (!profile) {
      return { success: false, error: 'Organizer profile not found' }
    }

    // Verify ownership
    const eventResults = await prisma.$queryRawUnsafe<
      [{ id: number; organizer_id: number; status: string }]
    >(`SELECT id, organizer_id, status FROM events WHERE id = $1`, eventId)

    const event = eventResults[0]
    if (!event || event.organizer_id !== profile.id) {
      return { success: false, error: 'Event not found' }
    }

    if (event.status !== 'draft') {
      return { success: false, error: 'Only draft events can be submitted for review' }
    }

    if (profile.auto_approve) {
      await prisma.$queryRawUnsafe(
        `UPDATE events SET status = 'published', published_at = NOW() WHERE id = $1`,
        eventId
      )
    } else {
      await prisma.$queryRawUnsafe(
        `UPDATE events SET status = 'pending_review' WHERE id = $1`,
        eventId
      )
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit event for review'
    return { success: false, error: message }
  }
}

/**
 * Log organizer activity (event_activity_log — no Prisma model)
 */
export async function logOrganizerActivity(
  organizerId: number,
  action: string,
  details?: object,
  eventId?: number,
  ipAddress?: string
): Promise<void> {
  await prisma.$queryRawUnsafe(
    `INSERT INTO event_activity_log (organizer_id, event_id, action, details, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    organizerId,
    eventId || null,
    action,
    details ? JSON.stringify(details) : null,
    ipAddress || null
  )
}
