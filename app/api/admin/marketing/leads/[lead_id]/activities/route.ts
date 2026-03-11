import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, AuthSession } from '@/lib/api/middleware/auth-wrapper'
import { BadRequestError } from '@/lib/api/middleware/error-handler'
import { withCSRF } from '@/lib/api/middleware/csrf'
import { z } from 'zod'

const PostBodySchema = z.object({
  activity_type: z.enum([
    'email_sent', 'email_opened', 'email_clicked',
    'call_made', 'call_received', 'meeting',
    'note_added', 'status_changed', 'proposal_sent',
    'website_visit', 'form_submitted',
  ]),
  description: z.string().max(5000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  performed_by: z.number().int().positive().optional(),
})

// GET - Fetch activities for a lead (now from crm_activities)
async function getHandler(
  request: NextRequest,
  _session: AuthSession,
  context?: { params: Promise<Record<string, string>> }
) {
  const { lead_id } = await context!.params;
  const id = parseInt(lead_id)
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const activities: Record<string, unknown>[] = await prisma.$queryRawUnsafe(`
    SELECT
      a.*,
      u.name as performed_by_name
    FROM crm_activities a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.contact_id = $1
    ORDER BY a.created_at DESC
    LIMIT $2 OFFSET $3
  `, id, limit, offset)

  const countRows: { count: bigint }[] = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) FROM crm_activities WHERE contact_id = $1',
    id
  )

  return NextResponse.json({
    activities,
    total: Number(countRows[0].count),
    limit,
    offset
  })
}

// POST - Log new activity (now inserts into crm_activities)
async function postHandler(
  request: NextRequest,
  _session: AuthSession,
  context?: { params: Promise<Record<string, string>> }
) {
  const { lead_id } = await context!.params;
  const id = parseInt(lead_id)
  const body = PostBodySchema.parse(await request.json())

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
    throw new BadRequestError('Invalid or missing activity type')
  }

  const resultRows: Record<string, unknown>[] = await prisma.$queryRawUnsafe(`
    INSERT INTO crm_activities (
      contact_id, activity_type, description, metadata, performed_by, created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `,
    id,
    activity_type,
    description || null,
    metadata ? JSON.stringify(metadata) : null,
    performed_by || null
  )

  // Update last_contacted_at on the CRM contact for certain activities
  const contactActivities = ['email_sent', 'call_made', 'call_received', 'meeting']
  if (contactActivities.includes(activity_type)) {
    await prisma.$queryRawUnsafe(`
      UPDATE crm_contacts
      SET last_contacted_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, id)
  }

  return NextResponse.json({
    success: true,
    activity: resultRows[0]
  })
}

export const GET = withAdminAuth(getHandler)
export const POST = withCSRF(
  withAdminAuth(postHandler)
)
