import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// GET - Fetch scheduled posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    let query = `
      SELECT 
        sp.*,
        sa.account_name,
        u.name as created_by_name
      FROM scheduled_posts sp
      LEFT JOIN social_accounts sa ON sp.account_id = sa.id
      LEFT JOIN users u ON sp.created_by = u.id
      WHERE 1=1
    `
    const params: (string | number)[] = []
    let paramIndex = 1

    if (status && status !== 'all') {
      query += ` AND sp.status = $${paramIndex++}`
      params.push(status)
    }

    if (platform && platform !== 'all') {
      query += ` AND sp.platform = $${paramIndex++}`
      params.push(platform)
    }

    if (start_date) {
      query += ` AND sp.scheduled_for >= $${paramIndex++}`
      params.push(start_date)
    }

    if (end_date) {
      query += ` AND sp.scheduled_for <= $${paramIndex++}`
      params.push(end_date)
    }

    query += ` ORDER BY sp.scheduled_for ASC`

    const result = await pool.query(query, params)

    return NextResponse.json({
      posts: result.rows,
      total: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching social posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social posts' },
      { status: 500 }
    )
  }
}

// POST - Create new scheduled post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      content,
      media_urls,
      hashtags,
      link_url,
      platform,
      account_id,
      scheduled_for,
      timezone,
      ab_test_id,
      variant_letter,
      created_by
    } = body

    // Validation
    if (!content || !platform || !scheduled_for) {
      return NextResponse.json(
        { error: 'Content, platform, and scheduled time are required' },
        { status: 400 }
      )
    }

    const result = await pool.query(`
      INSERT INTO scheduled_posts (
        content, media_urls, hashtags, link_url,
        platform, account_id, scheduled_for, timezone,
        status, ab_test_id, variant_letter, created_by,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9, $10, $11, NOW(), NOW()
      ) RETURNING *
    `, [
      content,
      media_urls || [],
      hashtags || [],
      link_url || null,
      platform,
      account_id || null,
      scheduled_for,
      timezone || 'America/Los_Angeles',
      ab_test_id || null,
      variant_letter || null,
      created_by || null
    ])

    return NextResponse.json({
      success: true,
      post: result.rows[0]
    })

  } catch (error) {
    console.error('Error creating social post:', error)
    return NextResponse.json(
      { error: 'Failed to create social post' },
      { status: 500 }
    )
  }
}

// PATCH - Update post (status, reschedule, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const allowedFields = [
      'content', 'media_urls', 'hashtags', 'link_url',
      'scheduled_for', 'status'
    ]

    const setClause: string[] = []
    const params: (string | number | string[])[] = [id]
    let paramIndex = 2

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex++}`)
        params.push(value as string | number | string[])
      }
    }

    if (setClause.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    setClause.push(`updated_at = NOW()`)

    const result = await pool.query(`
      UPDATE scheduled_posts
      SET ${setClause.join(', ')}
      WHERE id = $1
      RETURNING *
    `, params)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      post: result.rows[0]
    })

  } catch (error) {
    console.error('Error updating social post:', error)
    return NextResponse.json(
      { error: 'Failed to update social post' },
      { status: 500 }
    )
  }
}




