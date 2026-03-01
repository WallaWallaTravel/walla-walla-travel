import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError } from '@/lib/api/middleware/error-handler'

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

// POST - Import leads from CSV/JSON (now inserts into crm_contacts)
async function postHandler(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  let leads: ImportedLead[] = []
  let skipped = 0
  const errors: string[] = []

  if (contentType.includes('application/json')) {
    const body = await request.json()
    leads = body.leads || []
  } else if (contentType.includes('text/csv') || contentType.includes('multipart/form-data')) {
    const text = await request.text()
    leads = parseCSV(text)
  } else {
    throw new BadRequestError('Unsupported content type. Use application/json or text/csv')
  }

  if (leads.length === 0) {
    throw new BadRequestError('No leads to import')
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

    // Check for duplicate email in crm_contacts
    const existing = await query(
      'SELECT id FROM crm_contacts WHERE email = $1',
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

    // Parse interested_services for source_detail
    let servicesStr: string | null = null
    if (typeof lead.interested_services === 'string') {
      servicesStr = lead.interested_services.split(',').map(s => s.trim()).filter(Boolean).join(', ')
    } else if (Array.isArray(lead.interested_services)) {
      servicesStr = lead.interested_services.join(', ')
    }

    // Combine first_name + last_name into name
    const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ')

    try {
      const result = await query(`
        INSERT INTO crm_contacts (
          email, name, phone, company, contact_type, lifecycle_stage,
          lead_score, lead_temperature, source, source_detail, notes,
          brand_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'lead', $6, $7, $8, $9, $10, 1, NOW(), NOW()
        ) RETURNING id
      `, [
        lead.email.toLowerCase(),
        fullName,
        lead.phone || null,
        lead.company || null,
        lead.company ? 'corporate' : 'individual',
        score,
        temperature,
        lead.source || 'import',
        servicesStr,
        lead.notes || null,
      ])

      const contactId = result.rows[0].id

      // If party size, estimated date, or budget provided, create a deal (same pattern as POST in leads/route.ts)
      if (lead.party_size_estimate || lead.estimated_date || lead.budget_range) {
        const stageResult = await query(`
          SELECT ps.id
          FROM crm_pipeline_stages ps
          JOIN crm_pipeline_templates pt ON ps.template_id = pt.id
          WHERE (pt.brand = 'walla_walla_travel' OR pt.brand IS NULL)
            AND ps.is_won = false AND ps.is_lost = false
          ORDER BY pt.is_default DESC, ps.sort_order ASC
          LIMIT 1
        `)

        if (stageResult.rows.length > 0) {
          let estimatedValue: number | null = null
          if (lead.budget_range) {
            const match = String(lead.budget_range).match(/\$?([\d,]+)/)
            if (match) {
              estimatedValue = parseInt(match[1].replace(/,/g, ''))
            }
          }

          await query(`
            INSERT INTO crm_deals (
              contact_id, stage_id, brand, title, description,
              party_size, expected_tour_date, estimated_value, brand_id
            ) VALUES ($1, $2, 'walla_walla_travel', $3, $4, $5, $6, $7, 1)
          `, [
            contactId,
            stageResult.rows[0].id,
            `Lead - ${fullName}`,
            servicesStr || lead.notes || 'Imported lead',
            lead.party_size_estimate ? parseInt(String(lead.party_size_estimate)) : null,
            lead.estimated_date || null,
            estimatedValue
          ])
        }
      }

      imported.push(contactId)
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

export const POST = withAdminAuth(postHandler)
