import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// GET - Fetch single winery with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ winery_id: string }> }
) {
  try {
    const { winery_id } = await params
    const id = parseInt(winery_id)

    const result = await pool.query(`
      SELECT * FROM wineries WHERE id = $1
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Winery not found' },
        { status: 404 }
      )
    }

    // Get wines for this winery
    const winesResult = await pool.query(`
      SELECT * FROM wines WHERE winery_id = $1 ORDER BY name
    `, [id]).catch(() => ({ rows: [] }))

    // Get content chunks
    const contentResult = await pool.query(`
      SELECT * FROM winery_content WHERE winery_id = $1 ORDER BY content_type
    `, [id]).catch(() => ({ rows: [] }))

    return NextResponse.json({
      winery: result.rows[0],
      wines: winesResult.rows,
      content: contentResult.rows
    })

  } catch (error) {
    console.error('Error fetching winery:', error)
    return NextResponse.json(
      { error: 'Failed to fetch winery' },
      { status: 500 }
    )
  }
}

// PATCH - Update winery
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ winery_id: string }> }
) {
  try {
    const { winery_id } = await params
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
      'founded_year', 'annual_production_cases', 'vineyard_acres'
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
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await pool.query(`
      UPDATE wineries
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Winery not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      winery: result.rows[0]
    })

  } catch (error) {
    console.error('Error updating winery:', error)
    return NextResponse.json(
      { error: 'Failed to update winery' },
      { status: 500 }
    )
  }
}

// DELETE - Delete winery
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ winery_id: string }> }
) {
  try {
    const { winery_id } = await params
    const id = parseInt(winery_id)

    await pool.query('DELETE FROM wineries WHERE id = $1', [id])

    return NextResponse.json({
      success: true,
      message: 'Winery deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting winery:', error)
    return NextResponse.json(
      { error: 'Failed to delete winery' },
      { status: 500 }
    )
  }
}




