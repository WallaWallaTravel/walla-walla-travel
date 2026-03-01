import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError, NotFoundError } from '@/lib/api/middleware/error-handler'

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
export const PATCH = withAdminAuth(async (
  request: NextRequest,
  _session,
  context
) => {
  const { winery_id } = await context!.params

  const id = parseInt(winery_id)
  const body = await request.json()

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

// DELETE - Delete winery
export const DELETE = withAdminAuth(async (
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
