import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError } from '@/lib/api/middleware/error-handler'

const VariantSchema = z.object({
  name: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  caption: z.string().max(5000).optional(),
  image_url: z.string().max(500).optional(),
  video_url: z.string().max(500).optional(),
  hashtags: z.array(z.string().max(255)).optional(),
  cta: z.string().max(500).optional(),
  post_time: z.string().max(255).optional(),
  post_days: z.array(z.string().max(50)).optional(),
})

const BodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  hypothesis: z.string().max(5000).optional(),
  test_type: z.string().min(1).max(255),
  variable_tested: z.string().max(255).optional(),
  platform: z.string().max(255).optional(),
  sample_size_target: z.number().int().positive().optional(),
  variant_a: VariantSchema.optional(),
  variant_b: VariantSchema.optional(),
  created_by: z.string().max(255).optional(),
})

// GET - Fetch A/B tests with variants
export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const platform = searchParams.get('platform')

  let queryText = `
    SELECT
      t.*,
      json_agg(
        json_build_object(
          'variant_letter', v.variant_letter,
          'name', v.name,
          'description', v.description,
          'caption', v.caption,
          'impressions', v.impressions,
          'reach', v.reach,
          'engagement', v.engagement,
          'clicks', v.clicks,
          'conversions', v.conversions,
          'cost', v.cost
        ) ORDER BY v.variant_letter
      ) FILTER (WHERE v.id IS NOT NULL) as variants
    FROM ab_tests t
    LEFT JOIN test_variants v ON t.id = v.test_id
    WHERE 1=1
  `
  const params: string[] = []
  let paramIndex = 1

  if (status && status !== 'all') {
    queryText += ` AND t.status = $${paramIndex++}`
    params.push(status)
  }

  if (platform && platform !== 'all') {
    queryText += ` AND t.platform = $${paramIndex++}`
    params.push(platform)
  }

  queryText += ` GROUP BY t.id ORDER BY t.created_at DESC`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await prisma.$queryRawUnsafe<any[]>(queryText, ...params)

  // Transform results
  const tests = rows.map(row => ({
    ...row,
    variant_a: row.variants?.find((v: { variant_letter: string }) => v.variant_letter === 'a') || null,
    variant_b: row.variants?.find((v: { variant_letter: string }) => v.variant_letter === 'b') || null,
  }))

  return NextResponse.json({
    tests,
    total: tests.length
  })
})

// POST - Create new A/B test
export const POST = withAdminAuth(async (request: NextRequest, _session) => {
  const body = BodySchema.parse(await request.json())

  const {
    name,
    description,
    hypothesis,
    test_type,
    variable_tested,
    platform,
    sample_size_target,
    variant_a,
    variant_b,
    created_by
  } = body

  // Validation
  if (!name || !test_type) {
    throw new BadRequestError('Name and test type are required')
  }

  // Create test
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testRows = await prisma.$queryRaw<any[]>`
    INSERT INTO ab_tests (
      name, description, hypothesis, test_type,
      variable_tested, platform, sample_size_target,
      status, created_by, created_at, updated_at
    ) VALUES (
      ${name},
      ${description || null},
      ${hypothesis || null},
      ${test_type},
      ${variable_tested || null},
      ${platform || 'all'},
      ${sample_size_target || null},
      'draft',
      ${created_by || null},
      NOW(), NOW()
    ) RETURNING *
  `

  const testId = testRows[0].id

  // Create variant A
  if (variant_a) {
    await prisma.$executeRaw`
      INSERT INTO test_variants (
        test_id, variant_letter, name, description,
        caption, image_url, video_url, hashtags,
        cta, post_time, post_days, created_at
      ) VALUES (
        ${testId}, 'a', ${variant_a.name || 'Variant A'},
        ${variant_a.description || null},
        ${variant_a.caption || null},
        ${variant_a.image_url || null},
        ${variant_a.video_url || null},
        ${variant_a.hashtags || []},
        ${variant_a.cta || null},
        ${variant_a.post_time || null},
        ${variant_a.post_days || []},
        NOW()
      )
    `
  }

  // Create variant B
  if (variant_b) {
    await prisma.$executeRaw`
      INSERT INTO test_variants (
        test_id, variant_letter, name, description,
        caption, image_url, video_url, hashtags,
        cta, post_time, post_days, created_at
      ) VALUES (
        ${testId}, 'b', ${variant_b.name || 'Variant B'},
        ${variant_b.description || null},
        ${variant_b.caption || null},
        ${variant_b.image_url || null},
        ${variant_b.video_url || null},
        ${variant_b.hashtags || []},
        ${variant_b.cta || null},
        ${variant_b.post_time || null},
        ${variant_b.post_days || []},
        NOW()
      )
    `
  }

  return NextResponse.json({
    success: true,
    test: testRows[0]
  })
})
