'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import {
  UpdatePartnerProfileSchema,
  CreatePartnerInvitationSchema,
  CreateHotelPartnerSchema,
  UpdateHotelPartnerSchema,
  type UpdatePartnerProfileInput,
  type CreatePartnerInvitationInput,
  type CreateHotelPartnerInput,
  type UpdateHotelPartnerInput,
} from '@/lib/schemas/partner'
import crypto from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export type PartnerActionResult = {
  success: boolean
  data?: Record<string, unknown>
  error?: string | Record<string, string[]>
}

// ============================================================================
// PARTNER PROFILE MUTATIONS
// ============================================================================

/**
 * Update partner profile (partner portal)
 */
export async function updatePartnerProfile(
  userId: number,
  data: UpdatePartnerProfileInput
): Promise<PartnerActionResult> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Partners can only update their own profile
  if (session.user.role === 'partner' && session.user.id !== userId) {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = UpdatePartnerProfileSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const updateData: Record<string, unknown> = {}
    if (parsed.data.business_name !== undefined) updateData.business_name = parsed.data.business_name
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes

    const updated = await prisma.partner_profiles.updateMany({
      where: { user_id: userId },
      data: {
        ...updateData,
        updated_at: new Date(),
      },
    })

    if (updated.count === 0) {
      return { success: false, error: 'Partner profile not found' }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update partner profile'
    return { success: false, error: message }
  }
}

/**
 * Create partner invitation (admin only)
 */
export async function createPartnerInvitation(
  data: CreatePartnerInvitationInput
): Promise<PartnerActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreatePartnerInvitationSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: { email: v.email.toLowerCase() },
    })

    if (existingUser) {
      return { success: false, error: 'A user with this email already exists' }
    }

    // Generate setup token
    const setupToken = crypto.randomBytes(32).toString('hex')
    const setupExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Create user with partner role (temporary password)
    const tempPassword = crypto.randomBytes(16).toString('hex')

    const user = await prisma.users.create({
      data: {
        email: v.email.toLowerCase(),
        name: v.business_name,
        password_hash: tempPassword,
        role: 'partner',
        is_active: true,
      },
    })

    // Create partner profile
    await prisma.partner_profiles.create({
      data: {
        user_id: user.id,
        business_name: v.business_name,
        business_type: v.business_type,
        winery_id: v.winery_id || null,
        status: 'pending',
        invited_by: session.user.id,
        invited_at: new Date(),
        setup_token: setupToken,
        setup_token_expires_at: setupExpires,
        notes: v.notes || null,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const setupUrl = `${appUrl}/partner-setup?token=${setupToken}`

    return {
      success: true,
      data: {
        user_id: user.id,
        setup_token: setupToken,
        setup_url: setupUrl,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create partner invitation'
    return { success: false, error: message }
  }
}

// ============================================================================
// HOTEL PARTNER MUTATIONS
// ============================================================================

/**
 * Create a new hotel partner (admin only)
 */
export async function createHotelPartner(
  data: CreateHotelPartnerInput
): Promise<PartnerActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateHotelPartnerSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const inviteToken = crypto.randomBytes(32).toString('hex')

    const hotel = await prisma.hotel_partners.create({
      data: {
        name: v.name,
        email: v.email,
        contact_name: v.contact_name || null,
        phone: v.phone || null,
        address: v.address || null,
        notes: v.notes || null,
        invite_token: inviteToken,
      },
    })

    return {
      success: true,
      data: {
        id: hotel.id,
        invite_token: inviteToken,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create hotel partner'
    return { success: false, error: message }
  }
}

/**
 * Update hotel partner (admin only)
 */
export async function updateHotelPartner(
  id: number,
  data: UpdateHotelPartnerInput
): Promise<PartnerActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = UpdateHotelPartnerSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const updateData: Record<string, unknown> = {}
    const v = parsed.data
    if (v.name !== undefined) updateData.name = v.name
    if (v.email !== undefined) updateData.email = v.email
    if (v.contact_name !== undefined) updateData.contact_name = v.contact_name
    if (v.phone !== undefined) updateData.phone = v.phone
    if (v.address !== undefined) updateData.address = v.address
    if (v.notes !== undefined) updateData.notes = v.notes
    if (v.is_active !== undefined) updateData.is_active = v.is_active

    await prisma.hotel_partners.update({
      where: { id },
      data: {
        ...updateData,
        updated_at: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update hotel partner'
    return { success: false, error: message }
  }
}

/**
 * Log partner activity (raw SQL — partner_activity_log is @@ignore)
 */
export async function logPartnerActivity(
  partnerProfileId: number,
  action: string,
  details?: object,
  ipAddress?: string
): Promise<void> {
  await prisma.$queryRawUnsafe(
    `INSERT INTO partner_activity_log (partner_profile_id, action, details, ip_address)
     VALUES ($1, $2, $3, $4)`,
    partnerProfileId,
    action,
    details ? JSON.stringify(details) : null,
    ipAddress || null
  )
}
