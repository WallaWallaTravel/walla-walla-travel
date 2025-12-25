import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// GET - Fetch single lead with activities
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  try {
    const { lead_id } = await params
    const id = parseInt(lead_id)

    // Get lead details
    const leadResult = await pool.query(`
      SELECT 
        l.*,
        u.name as assigned_to_name,
        u.email as assigned_to_email
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.id = $1
    `, [id])

    if (leadResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Get activities
    const activitiesResult = await pool.query(`
      SELECT 
        la.*,
        u.name as performed_by_name
      FROM lead_activities la
      LEFT JOIN users u ON la.performed_by = u.id
      WHERE la.lead_id = $1
      ORDER BY la.created_at DESC
      LIMIT 50
    `, [id])

    return NextResponse.json({
      lead: leadResult.rows[0],
      activities: activitiesResult.rows
    })

  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    )
  }
}

// PATCH - Update lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  try {
    const { lead_id } = await params
    const id = parseInt(lead_id)
    const body = await request.json()

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'company',
      'status', 'temperature', 'score', 'assigned_to',
      'interested_services', 'party_size_estimate', 'estimated_date',
      'budget_range', 'next_followup_at', 'notes', 'tags'
    ]

    const updates: string[] = []
    const values: (string | number | string[] | null)[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex++}`)
        values.push(value as string | number | string[] | null)
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await pool.query(`
      UPDATE leads
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Log status change activity if status was updated
    if (body.status) {
      await pool.query(`
        INSERT INTO lead_activities (
          lead_id, activity_type, description, metadata, created_at
        ) VALUES ($1, 'status_changed', $2, $3, NOW())
      `, [
        id,
        `Status changed to ${body.status}`,
        JSON.stringify({ new_status: body.status })
      ])
    }

    return NextResponse.json({
      success: true,
      lead: result.rows[0]
    })

  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

// DELETE - Delete lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> }
) {
  try {
    const { lead_id } = await params
    const id = parseInt(lead_id)

    await pool.query('DELETE FROM leads WHERE id = $1', [id])

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}







