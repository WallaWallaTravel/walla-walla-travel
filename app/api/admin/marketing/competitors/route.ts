import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// GET - Fetch competitors with change counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const priority = searchParams.get('priority')
    const active_only = searchParams.get('active_only') !== 'false'

    let query = `
      SELECT 
        c.*,
        COUNT(cc.id) FILTER (WHERE cc.status = 'new') as unreviewed_changes
      FROM competitors c
      LEFT JOIN competitor_changes cc ON c.id = cc.competitor_id
      WHERE 1=1
    `
    const params: string[] = []
    let paramIndex = 1

    if (active_only) {
      query += ` AND c.is_active = TRUE`
    }

    if (priority) {
      query += ` AND c.priority_level = $${paramIndex++}`
      params.push(priority)
    }

    query += ` 
      GROUP BY c.id 
      ORDER BY 
        CASE c.priority_level 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          ELSE 3 
        END,
        c.name
    `

    const result = await pool.query(query, params)

    return NextResponse.json({
      competitors: result.rows,
      total: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching competitors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch competitors' },
      { status: 500 }
    )
  }
}

// POST - Add new competitor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      website_url,
      description,
      priority_level,
      check_frequency,
      monitor_pricing,
      monitor_promotions,
      monitor_packages,
      monitor_content,
      email_recipients
    } = body

    // Validation
    if (!name || !website_url) {
      return NextResponse.json(
        { error: 'Name and website URL are required' },
        { status: 400 }
      )
    }

    const result = await pool.query(`
      INSERT INTO competitors (
        name, website_url, description, priority_level,
        check_frequency, monitor_pricing, monitor_promotions,
        monitor_packages, monitor_content, email_recipients,
        is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW(), NOW()
      ) RETURNING *
    `, [
      name,
      website_url,
      description || null,
      priority_level || 'medium',
      check_frequency || 'every_6_hours',
      monitor_pricing !== false,
      monitor_promotions !== false,
      monitor_packages !== false,
      monitor_content !== false,
      email_recipients || []
    ])

    return NextResponse.json({
      success: true,
      competitor: result.rows[0]
    })

  } catch (error) {
    console.error('Error creating competitor:', error)
    return NextResponse.json(
      { error: 'Failed to create competitor' },
      { status: 500 }
    )
  }
}

