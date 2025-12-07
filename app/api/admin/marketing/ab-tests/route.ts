import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// GET - Fetch A/B tests with variants
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')

    let query = `
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
      query += ` AND t.status = $${paramIndex++}`
      params.push(status)
    }

    if (platform && platform !== 'all') {
      query += ` AND t.platform = $${paramIndex++}`
      params.push(platform)
    }

    query += ` GROUP BY t.id ORDER BY t.created_at DESC`

    const result = await pool.query(query, params)

    // Transform results
    const tests = result.rows.map(row => ({
      ...row,
      variant_a: row.variants?.find((v: { variant_letter: string }) => v.variant_letter === 'a') || null,
      variant_b: row.variants?.find((v: { variant_letter: string }) => v.variant_letter === 'b') || null,
    }))

    return NextResponse.json({
      tests,
      total: tests.length
    })

  } catch (error) {
    console.error('Error fetching A/B tests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch A/B tests' },
      { status: 500 }
    )
  }
}

// POST - Create new A/B test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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
      return NextResponse.json(
        { error: 'Name and test type are required' },
        { status: 400 }
      )
    }

    // Start transaction
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Create test
      const testResult = await client.query(`
        INSERT INTO ab_tests (
          name, description, hypothesis, test_type,
          variable_tested, platform, sample_size_target,
          status, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'draft', $8, NOW(), NOW()
        ) RETURNING *
      `, [
        name,
        description || null,
        hypothesis || null,
        test_type,
        variable_tested || null,
        platform || 'all',
        sample_size_target || null,
        created_by || null
      ])

      const testId = testResult.rows[0].id

      // Create variant A
      if (variant_a) {
        await client.query(`
          INSERT INTO test_variants (
            test_id, variant_letter, name, description,
            caption, image_url, video_url, hashtags,
            cta, post_time, post_days, created_at
          ) VALUES (
            $1, 'a', $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
          )
        `, [
          testId,
          variant_a.name || 'Variant A',
          variant_a.description || null,
          variant_a.caption || null,
          variant_a.image_url || null,
          variant_a.video_url || null,
          variant_a.hashtags || [],
          variant_a.cta || null,
          variant_a.post_time || null,
          variant_a.post_days || []
        ])
      }

      // Create variant B
      if (variant_b) {
        await client.query(`
          INSERT INTO test_variants (
            test_id, variant_letter, name, description,
            caption, image_url, video_url, hashtags,
            cta, post_time, post_days, created_at
          ) VALUES (
            $1, 'b', $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
          )
        `, [
          testId,
          variant_b.name || 'Variant B',
          variant_b.description || null,
          variant_b.caption || null,
          variant_b.image_url || null,
          variant_b.video_url || null,
          variant_b.hashtags || [],
          variant_b.cta || null,
          variant_b.post_time || null,
          variant_b.post_days || []
        ])
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        test: testResult.rows[0]
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error creating A/B test:', error)
    return NextResponse.json(
      { error: 'Failed to create A/B test' },
      { status: 500 }
    )
  }
}

