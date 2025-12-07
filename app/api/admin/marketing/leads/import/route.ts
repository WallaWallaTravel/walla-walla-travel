import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

interface ImportedLead {
  first_name: string
  last_name?: string
  email: string
  phone?: string
  company?: string
  source?: string
  interested_services?: string | string[]
  party_size_estimate?: number | string
  estimated_date?: string
  budget_range?: string
  notes?: string
}

// POST - Import leads from CSV/JSON
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let leads: ImportedLead[] = []
    let skipped = 0
    let errors: string[] = []

    if (contentType.includes('application/json')) {
      const body = await request.json()
      leads = body.leads || []
    } else if (contentType.includes('text/csv') || contentType.includes('multipart/form-data')) {
      const text = await request.text()
      leads = parseCSV(text)
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use application/json or text/csv' },
        { status: 400 }
      )
    }

    if (leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads to import' },
        { status: 400 }
      )
    }

    const imported: number[] = []

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i]
      
      // Validate required fields
      if (!lead.email || !lead.first_name) {
        skipped++
        errors.push(`Row ${i + 1}: Missing required field (email or first_name)`)
        continue
      }

      // Check for duplicate email
      const existing = await pool.query(
        'SELECT id FROM leads WHERE email = $1',
        [lead.email.toLowerCase()]
      )

      if (existing.rows.length > 0) {
        skipped++
        errors.push(`Row ${i + 1}: Duplicate email ${lead.email}`)
        continue
      }

      // Calculate initial score
      let score = 20
      if (lead.phone) score += 10
      if (lead.company) score += 10
      if (lead.party_size_estimate) score += 10
      if (lead.estimated_date) score += 15
      if (lead.budget_range) score += 10
      if (lead.interested_services) score += 15

      // Determine temperature
      let temperature: 'hot' | 'warm' | 'cold' = 'cold'
      if (score >= 70) temperature = 'hot'
      else if (score >= 50) temperature = 'warm'

      // Parse interested_services
      let services: string[] = []
      if (typeof lead.interested_services === 'string') {
        services = lead.interested_services.split(',').map(s => s.trim()).filter(Boolean)
      } else if (Array.isArray(lead.interested_services)) {
        services = lead.interested_services
      }

      try {
        const result = await pool.query(`
          INSERT INTO leads (
            first_name, last_name, email, phone, company,
            source, interested_services, party_size_estimate,
            estimated_date, budget_range, notes,
            score, temperature, status,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'new', NOW(), NOW()
          ) RETURNING id
        `, [
          lead.first_name,
          lead.last_name || null,
          lead.email.toLowerCase(),
          lead.phone || null,
          lead.company || null,
          lead.source || 'import',
          services,
          lead.party_size_estimate ? parseInt(String(lead.party_size_estimate)) : null,
          lead.estimated_date || null,
          lead.budget_range || null,
          lead.notes || null,
          score,
          temperature
        ])

        imported.push(result.rows[0].id)
      } catch (err) {
        skipped++
        errors.push(`Row ${i + 1}: Database error - ${(err as Error).message}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped,
      errors: errors.slice(0, 10), // Return first 10 errors only
      total_processed: leads.length
    })

  } catch (error) {
    console.error('Error importing leads:', error)
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    )
  }
}

function parseCSV(csv: string): ImportedLead[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  // Parse headers
  const headers = lines[0].split(',').map(h => 
    h.trim().toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '_')
  )

  const leads: ImportedLead[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const lead: Record<string, string> = {}

    headers.forEach((header, index) => {
      if (values[index]) {
        lead[header] = values[index].trim().replace(/^["']|["']$/g, '')
      }
    })

    // Map common header variations
    leads.push({
      first_name: lead.first_name || lead.firstname || lead.first || '',
      last_name: lead.last_name || lead.lastname || lead.last,
      email: lead.email || lead.email_address || '',
      phone: lead.phone || lead.phone_number || lead.mobile,
      company: lead.company || lead.organization || lead.business,
      source: lead.source || lead.lead_source,
      interested_services: lead.interested_services || lead.services || lead.interests,
      party_size_estimate: lead.party_size_estimate || lead.party_size || lead.group_size,
      estimated_date: lead.estimated_date || lead.event_date || lead.date,
      budget_range: lead.budget_range || lead.budget,
      notes: lead.notes || lead.comments || lead.description
    })
  }

  return leads
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

