import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// GET - Fetch email campaigns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const campaign_type = searchParams.get('campaign_type')

    let query = `
      SELECT 
        id, name, subject, preview_text,
        status, campaign_type,
        scheduled_for, sent_at,
        recipients_count, opened_count, clicked_count,
        bounced_count, unsubscribed_count,
        template_id, content_html, content_json,
        created_by, created_at, updated_at
      FROM email_campaigns
      WHERE 1=1
    `
    const params: string[] = []
    let paramIndex = 1

    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex++}`
      params.push(status)
    }

    if (campaign_type && campaign_type !== 'all') {
      query += ` AND campaign_type = $${paramIndex++}`
      params.push(campaign_type)
    }

    query += ` ORDER BY created_at DESC`

    const result = await pool.query(query, params)

    // Calculate aggregate stats
    const stats = {
      total_sent: result.rows
        .filter(c => c.status === 'sent')
        .reduce((sum, c) => sum + (c.recipients_count || 0), 0),
      total_opened: result.rows.reduce((sum, c) => sum + (c.opened_count || 0), 0),
      total_clicked: result.rows.reduce((sum, c) => sum + (c.clicked_count || 0), 0),
      avg_open_rate: 0,
      avg_click_rate: 0
    }

    if (stats.total_sent > 0) {
      stats.avg_open_rate = (stats.total_opened / stats.total_sent) * 100
      stats.avg_click_rate = stats.total_opened > 0 
        ? (stats.total_clicked / stats.total_opened) * 100 
        : 0
    }

    return NextResponse.json({
      campaigns: result.rows,
      stats,
      total: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching email campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email campaigns' },
      { status: 500 }
    )
  }
}

// POST - Create new email campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      subject,
      preview_text,
      campaign_type,
      template_id,
      content_html,
      content_json,
      scheduled_for,
      recipient_list_ids,
      created_by
    } = body

    // Validate required fields
    if (!name || !subject) {
      return NextResponse.json(
        { error: 'Name and subject are required' },
        { status: 400 }
      )
    }

    const result = await pool.query(`
      INSERT INTO email_campaigns (
        name, subject, preview_text, campaign_type,
        template_id, content_html, content_json,
        status, scheduled_for, recipient_list_ids,
        recipients_count, opened_count, clicked_count,
        bounced_count, unsubscribed_count,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9,
        0, 0, 0, 0, 0, $10, NOW(), NOW()
      ) RETURNING *
    `, [
      name,
      subject,
      preview_text || null,
      campaign_type || 'promotional',
      template_id || null,
      content_html || null,
      content_json ? JSON.stringify(content_json) : null,
      scheduled_for || null,
      recipient_list_ids || [],
      created_by || null
    ])

    return NextResponse.json({
      success: true,
      campaign: result.rows[0]
    })

  } catch (error) {
    console.error('Error creating email campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create email campaign' },
      { status: 500 }
    )
  }
}







