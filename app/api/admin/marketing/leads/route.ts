import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// GET - Fetch leads with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const temperature = searchParams.get('temperature')
    const source = searchParams.get('source')
    const assigned_to = searchParams.get('assigned_to')

    let query = `
      SELECT 
        l.*,
        u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE 1=1
    `
    const params: (string | number)[] = []
    let paramIndex = 1

    if (status && status !== 'all') {
      query += ` AND l.status = $${paramIndex++}`
      params.push(status)
    }

    if (temperature) {
      query += ` AND l.temperature = $${paramIndex++}`
      params.push(temperature)
    }

    if (source) {
      query += ` AND l.source = $${paramIndex++}`
      params.push(source)
    }

    if (assigned_to) {
      query += ` AND l.assigned_to = $${paramIndex++}`
      params.push(parseInt(assigned_to))
    }

    query += ` ORDER BY 
      CASE l.temperature WHEN 'hot' THEN 1 WHEN 'warm' THEN 2 ELSE 3 END,
      l.score DESC,
      l.created_at DESC
    `

    const result = await pool.query(query, params)

    return NextResponse.json({
      leads: result.rows,
      total: result.rows.length
    })

  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

// POST - Create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      first_name,
      last_name,
      email,
      phone,
      company,
      source,
      interested_services,
      party_size_estimate,
      estimated_date,
      budget_range,
      notes,
      assigned_to
    } = body

    // Basic validation
    if (!first_name || !email) {
      return NextResponse.json(
        { error: 'First name and email are required' },
        { status: 400 }
      )
    }

    // Calculate initial score based on data completeness
    let score = 20 // base score
    if (phone) score += 10
    if (company) score += 10
    if (interested_services?.length > 0) score += 15
    if (party_size_estimate) score += 10
    if (estimated_date) score += 15
    if (budget_range) score += 10
    if (notes) score += 10

    // Determine temperature based on score
    let temperature: 'hot' | 'warm' | 'cold' = 'cold'
    if (score >= 70) temperature = 'hot'
    else if (score >= 50) temperature = 'warm'

    const result = await pool.query(`
      INSERT INTO leads (
        first_name, last_name, email, phone, company,
        source, interested_services, party_size_estimate,
        estimated_date, budget_range, notes, assigned_to,
        score, temperature, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'new', NOW(), NOW()
      ) RETURNING *
    `, [
      first_name,
      last_name || null,
      email,
      phone || null,
      company || null,
      source || 'website',
      interested_services || [],
      party_size_estimate || null,
      estimated_date || null,
      budget_range || null,
      notes || null,
      assigned_to || null,
      score,
      temperature
    ])

    return NextResponse.json({
      success: true,
      lead: result.rows[0]
    })

  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}







