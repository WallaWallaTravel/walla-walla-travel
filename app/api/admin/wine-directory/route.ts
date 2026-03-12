import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError } from '@/lib/api/middleware/error-handler'
import { withCSRF } from '@/lib/api/middleware/csrf'
import { z } from 'zod'
import { invalidateCache } from '@/lib/api/middleware/redis-cache'

const PostBodySchema = z.object({
  name: z.string().min(1).max(255),
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
  reservation_required: z.boolean().optional(),
  walk_ins_welcome: z.boolean().optional(),
  hours: z.record(z.string(), z.unknown()).optional(),
  amenities: z.array(z.string()).optional(),
  is_verified: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  logo_url: z.string().max(2000).optional(),
  hero_image_url: z.string().max(2000).optional(),
  founded_year: z.number().int().optional(),
  annual_production_cases: z.number().int().optional(),
  vineyard_acres: z.number().optional(),
})

// GET - Fetch wineries with filtering
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const ava = searchParams.get('ava')
  const featured = searchParams.get('featured')
  const verified = searchParams.get('verified')
  const active_only = searchParams.get('active_only') !== 'false'

  // Check if the featured_photo_override_id column exists
  const columnCheckRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'wineries' AND column_name = 'featured_photo_override_id'
    ) as exists`
  )
  const hasOverrideColumn = columnCheckRows[0]?.exists ?? false

  const overrideColumnSelect = hasOverrideColumn ? 'featured_photo_override_id,' : 'NULL::integer as featured_photo_override_id,'

  let queryText = `
    SELECT
      id, name, slug, city, state, ava,
      is_verified, is_featured, is_active,
      tasting_room_fee, reservation_required, walk_ins_welcome,
      amenities, logo_url, hero_image_url,
      phone, email, website,
      ${overrideColumnSelect}
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

  const wineryRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(queryText, ...params)

  return NextResponse.json({
    wineries: wineryRows,
    total: wineryRows.length
  })
})

// POST - Create new winery
export const POST = withCSRF(
  withAdminAuth(async (request: NextRequest, _session) => {
  const body = PostBodySchema.parse(await request.json())

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

  const insertRows = await prisma.$queryRawUnsafe<Record<string, any>[]>(`
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
  `,
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
  ).catch((error: any) => {
    // Check for unique constraint violation
    if (error.code === '23505' || error.code === 'P2002') {
      throw new BadRequestError('A winery with this slug already exists')
    }
    throw error
  })

  await invalidateCache('wineries:');

  return NextResponse.json({
    success: true,
    winery: insertRows[0]
  })
})
)
