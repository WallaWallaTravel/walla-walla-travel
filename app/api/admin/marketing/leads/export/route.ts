import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth/session'
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required')
  }
  return session
}

// GET - Export leads as CSV
async function getHandler(request: NextRequest) {
  await verifyAdmin(request)

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const temperature = searchParams.get('temperature')
  const source = searchParams.get('source')
  const format = searchParams.get('format') || 'csv'

  let queryText = `
    SELECT
      l.id,
      l.first_name,
      l.last_name,
      l.email,
      l.phone,
      l.company,
      l.source,
      l.status,
      l.temperature,
      l.score,
      array_to_string(l.interested_services, ', ') as interested_services,
      l.party_size_estimate,
      l.estimated_date,
      l.budget_range,
      l.first_contact_at,
      l.last_contact_at,
      l.next_followup_at,
      l.notes,
      l.created_at
    FROM leads l
    WHERE 1=1
  `
  const params: string[] = []
  let paramIndex = 1

  if (status && status !== 'all') {
    queryText += ` AND l.status = $${paramIndex++}`
    params.push(status)
  }

  if (temperature) {
    queryText += ` AND l.temperature = $${paramIndex++}`
    params.push(temperature)
  }

  if (source) {
    queryText += ` AND l.source = $${paramIndex++}`
    params.push(source)
  }

  queryText += ` ORDER BY l.created_at DESC`

  const result = await query(queryText, params)

  if (format === 'json') {
    return NextResponse.json({
      leads: result.rows,
      total: result.rows.length,
      exported_at: new Date().toISOString()
    })
  }

  // Generate CSV
  const headers = [
    'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company',
    'Source', 'Status', 'Temperature', 'Score', 'Interested Services',
    'Party Size', 'Estimated Date', 'Budget Range',
    'First Contact', 'Last Contact', 'Next Followup', 'Notes', 'Created At'
  ]

  const csvRows = [
    headers.join(','),
    ...result.rows.map(row => [
      row.id,
      `"${(row.first_name || '').replace(/"/g, '""')}"`,
      `"${(row.last_name || '').replace(/"/g, '""')}"`,
      `"${(row.email || '').replace(/"/g, '""')}"`,
      `"${(row.phone || '').replace(/"/g, '""')}"`,
      `"${(row.company || '').replace(/"/g, '""')}"`,
      row.source || '',
      row.status || '',
      row.temperature || '',
      row.score || 0,
      `"${(row.interested_services || '').replace(/"/g, '""')}"`,
      row.party_size_estimate || '',
      row.estimated_date || '',
      `"${(row.budget_range || '').replace(/"/g, '""')}"`,
      row.first_contact_at || '',
      row.last_contact_at || '',
      row.next_followup_at || '',
      `"${(row.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      row.created_at
    ].join(','))
  ]

  const csv = csvRows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}

export const GET = withErrorHandling(getHandler)
