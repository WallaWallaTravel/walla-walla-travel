import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling, UnauthorizedError, BadRequestError } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required')
  }
  return session
}

// GET - Fetch wineries with filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  await verifyAdmin(request)

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const ava = searchParams.get('ava')
  const featured = searchParams.get('featured')
  const verified = searchParams.get('verified')
  const active_only = searchParams.get('active_only') !== 'false'

  let queryText = `
    SELECT
      id, name, slug, city, state, ava,
      is_verified, is_featured, is_active,
      tasting_room_fee, reservation_required, walk_ins_welcome,
      amenities, logo_url, hero_image_url,
      phone, email, website,
      created_at, updated_at
    FROM wineries
    WHERE 1=1
  `
  const params: (string | boolean)[] = []
  let paramIndex = 1

  if (active_only) {
    queryText += ` AND is_active = TRUE`
  }

  if (search) {
    queryText += ` AND (name ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`
    params.push(`%${search}%`)
    paramIndex++
  }

  if (ava) {
    queryText += ` AND ava = $${paramIndex++}`
    params.push(ava)
  }

  if (featured === 'true') {
    queryText += ` AND is_featured = TRUE`
  }

  if (verified === 'true') {
    queryText += ` AND is_verified = TRUE`
  }

  queryText += ` ORDER BY is_featured DESC, is_verified DESC, name ASC`

  const result = await query(queryText, params)

  return NextResponse.json({
    wineries: result.rows,
    total: result.rows.length
  })
})

// POST - Create new winery
export const POST = withErrorHandling(async (request: NextRequest) => {
  await verifyAdmin(request)

  const body = await request.json()

  const {
    name,
    slug,
    city,
    state,
    ava,
    address_line1,
    address_line2,
    zip,
    latitude,
    longitude,
    phone,
    email,
    website,
    tasting_room_fee,
    reservation_required,
    walk_ins_welcome,
    hours,
    amenities,
    is_verified,
    is_featured,
    is_active,
    logo_url,
    hero_image_url,
    founded_year,
    annual_production_cases,
    vineyard_acres
  } = body

  // Validate required fields
  if (!name) {
    throw new BadRequestError('Name is required')
  }

  // Generate slug if not provided
  const winerySlug = slug || name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const result = await query(`
    INSERT INTO wineries (
      name, slug, city, state, ava,
      address_line1, address_line2, zip, latitude, longitude,
      phone, email, website,
      tasting_room_fee, reservation_required, walk_ins_welcome,
      hours, amenities,
      is_verified, is_featured, is_active,
      logo_url, hero_image_url,
      founded_year, annual_production_cases, vineyard_acres,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24, $25, $26,
      NOW(), NOW()
    ) RETURNING *
  `, [
    name,
    winerySlug,
    city || 'Walla Walla',
    state || 'WA',
    ava || 'Walla Walla Valley',
    address_line1 || null,
    address_line2 || null,
    zip || null,
    latitude || null,
    longitude || null,
    phone || null,
    email || null,
    website || null,
    tasting_room_fee || null,
    reservation_required || false,
    walk_ins_welcome !== false,
    hours ? JSON.stringify(hours) : null,
    amenities || [],
    is_verified || false,
    is_featured || false,
    is_active !== false,
    logo_url || null,
    hero_image_url || null,
    founded_year || null,
    annual_production_cases || null,
    vineyard_acres || null
  ]).catch((error) => {
    // Check for unique constraint violation
    if (error.code === '23505') {
      throw new BadRequestError('A winery with this slug already exists')
    }
    throw error
  })

  return NextResponse.json({
    success: true,
    winery: result.rows[0]
  })
})
