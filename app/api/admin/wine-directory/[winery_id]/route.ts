import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler'
import { withCSRF } from '@/lib/api/middleware/csrf'
import { z } from 'zod'

const PatchBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  state: z.string().max(50).optional(),
  ava: z.string().max(255).optional(),
  address_line1: z.string().max(500).optional(),
  address_line2: z.string().max(500).optional(),
  zip: z.string().max(20).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  website: z.string().max(500).optional(),
  tasting_room_fee: z.string().max(255).optional().nullable(),
  tasting_room_waived_with_purchase: z.boolean().optional(),
  reservation_required: z.boolean().optional(),
  walk_ins_welcome: z.boolean().optional(),
  hours: z.record(z.string(), z.unknown()).optional(),
  seasonal_hours_notes: z.string().max(500).optional(),
  amenities: z.array(z.string()).optional(),
  is_verified: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  logo_url: z.string().max(2000).optional(),
  hero_image_url: z.string().max(2000).optional(),
  gallery_urls: z.array(z.string()).optional(),
  founded_year: z.number().int().optional(),
  annual_production_cases: z.number().int().optional(),
  vineyard_acres: z.number().optional(),
  featured_photo_override_id: z.number().int().optional().nullable(),
})

// GET - Fetch single winery with full details
export const GET = withAdminAuth(async (
  _request: NextRequest,
  _session,
  context
) => {
  const { winery_id } = await context!.params

  const id = parseInt(winery_id)

  const result = await query(`
    SELECT * FROM wineries WHERE id = $1
  `, [id])

  if (result.rows.length === 0) {
    throw new NotFoundError('Winery not found')
  }

  // Get wines for this winery
  const winesResult = await query(`
    SELECT * FROM wines WHERE winery_id = $1 ORDER BY name
  `, [id]).catch(() => ({ rows: [] }))

  // Get content chunks
  const contentResult = await query(`
    SELECT * FROM winery_content WHERE winery_id = $1 ORDER BY content_type
  `, [id]).catch(() => ({ rows: [] }))

  return NextResponse.json({
    winery: result.rows[0],
    wines: winesResult.rows,
    content: contentResult.rows
  })
})

// PATCH - Update winery
export const PATCH = withCSRF(
  withAdminAuth(async (
  request: NextRequest,
  _session,
  context
) => {
  const { winery_id } = await context!.params

  const id = parseInt(winery_id)
  const body = PatchBodySchema.parse(await request.json())

  const allowedFields = [
    'name', 'slug', 'city', 'state', 'ava',
    'address_line1', 'address_line2', 'zip', 'latitude', 'longitude',
    'phone', 'email', 'website',
    'tasting_room_fee', 'tasting_room_waived_with_purchase',
    'reservation_required', 'walk_ins_welcome',
    'hours', 'seasonal_hours_notes', 'amenities',
    'is_verified', 'is_featured', 'is_active',
    'logo_url', 'hero_image_url', 'gallery_urls',
    'founded_year', 'annual_production_cases', 'vineyard_acres',
    'featured_photo_override_id'
  ]

  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = $${paramIndex++}`)
      // Handle JSON fields
      if (key === 'hours') {
        values.push(typeof value === 'string' ? value : JSON.stringify(value))
      } else {
        values.push(value)
      }
    }
  }

  if (updates.length === 0) {
    throw new BadRequestError('No valid fields to update')
  }

  updates.push(`updated_at = NOW()`)
  values.push(id)

  const result = await query(`
    UPDATE wineries
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values)

  if (result.rows.length === 0) {
    throw new NotFoundError('Winery not found')
  }

  return NextResponse.json({
    success: true,
    winery: result.rows[0]
  })
})
)

// DELETE - Delete winery
export const DELETE = withCSRF(
  withAdminAuth(async (
  _request: NextRequest,
  _session,
  context
) => {
  const { winery_id } = await context!.params

  const id = parseInt(winery_id)

  await query('DELETE FROM wineries WHERE id = $1', [id])

  return NextResponse.json({
    success: true,
    message: 'Winery deleted successfully'
  })
})
)
