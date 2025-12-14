import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// GET - Fetch activities for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  try {
    const { lead_id } = await params
    const id = parseInt(lead_id)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await pool.query(`
      SELECT 
        la.*,
        u.name as performed_by_name
      FROM lead_activities la
      LEFT JOIN users u ON la.performed_by = u.id
      WHERE la.lead_id = $1
      ORDER BY la.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset])

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM lead_activities WHERE lead_id = $1',
      [id]
    )

    return NextResponse.json({
      activities: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// POST - Log new activity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  try {
    const { lead_id } = await params
    const id = parseInt(lead_id)
    const body = await request.json()

    const {
      activity_type,
      description,
      metadata,
      performed_by
    } = body

    // Validate activity type
    const validTypes = [
      'email_sent', 'email_opened', 'email_clicked',
      'call_made', 'call_received', 'meeting',
      'note_added', 'status_changed', 'proposal_sent',
      'website_visit', 'form_submitted'
    ]

    if (!activity_type || !validTypes.includes(activity_type)) {
      return NextResponse.json(
        { error: 'Invalid or missing activity type' },
        { status: 400 }
      )
    }

    const result = await pool.query(`
      INSERT INTO lead_activities (
        lead_id, activity_type, description, metadata, performed_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [
      id,
      activity_type,
      description || null,
      metadata ? JSON.stringify(metadata) : null,
      performed_by || null
    ])

    // Update last_contact_at on the lead for certain activities
    const contactActivities = ['email_sent', 'call_made', 'call_received', 'meeting']
    if (contactActivities.includes(activity_type)) {
      await pool.query(`
        UPDATE leads 
        SET last_contact_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [id])
    }

    return NextResponse.json({
      success: true,
      activity: result.rows[0]
    })

  } catch (error) {
    console.error('Error logging activity:', error)
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    )
  }
}




