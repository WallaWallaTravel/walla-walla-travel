/**
 * AI Learning Preferences API
 *
 * View and manage the AI's learned content preferences.
 * Preferences are automatically created from content approval patterns.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'
import { withCSRF } from '@/lib/api/middleware/csrf';
import { auditService } from '@/lib/services/audit.service';

const PutBodySchema = z.object({
  id: z.number().int().positive(),
  isActive: z.boolean(),
})

export const GET = withAdminAuth(async (request: NextRequest, _session) => {
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') !== 'false'
  const platform = searchParams.get('platform')

  let queryText = `
    SELECT *
    FROM ai_learning_preferences
    WHERE 1=1
  `
  const params: (string | boolean)[] = []

  if (activeOnly) {
    queryText += ` AND is_active = true`
  }

  if (platform) {
    params.push(platform)
    queryText += ` AND platform = $${params.length}`
  }

  queryText += ` ORDER BY confidence_score DESC, learned_from_count DESC`

  const rows: any[] = await prisma.$queryRawUnsafe(queryText, ...params)

  // Get trust level based on total approvals
  const approvalCountRows: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as count
    FROM content_approvals
  `)

  const totalApprovals = approvalCountRows[0]?.count || 0
  let trustLevel: string
  let trustDescription: string

  if (totalApprovals < 20) {
    trustLevel = 'manual'
    trustDescription = 'All content requires approval. The AI is still learning your preferences.'
  } else if (totalApprovals < 50) {
    trustLevel = 'suggested'
    trustDescription = 'AI pre-selects "ready to publish" content, but you still approve everything.'
  } else if (totalApprovals < 100) {
    trustLevel = 'auto_with_digest'
    trustDescription = 'Routine content can auto-publish. You get a daily digest of what went out.'
  } else {
    trustLevel = 'full_auto'
    trustDescription = 'All content auto-publishes. Weekly report only.'
  }

  return NextResponse.json({
    preferences: rows,
    trustLevel,
    trustDescription,
    totalApprovals,
    approvalsToNextLevel: trustLevel === 'manual' ? 20 - totalApprovals
      : trustLevel === 'suggested' ? 50 - totalApprovals
      : trustLevel === 'auto_with_digest' ? 100 - totalApprovals
      : 0,
  })
});

export const PUT = withCSRF(
  withAdminAuth(async (request: NextRequest, _session) => {
  const body = PutBodySchema.parse(await request.json())
  const { id, isActive } = body

  if (!id || typeof isActive !== 'boolean') {
    return NextResponse.json(
      { error: 'Missing required fields: id, isActive' },
      { status: 400 }
    )
  }

  await prisma.$queryRawUnsafe(`
    UPDATE ai_learning_preferences
    SET is_active = $1, updated_at = NOW()
    WHERE id = $2
  `, isActive, id)

  return NextResponse.json({ success: true })
})
);

export const DELETE = withCSRF(
  withAdminAuth(async (request: NextRequest, session) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'Missing required parameter: id' },
      { status: 400 }
    )
  }

  await prisma.$queryRawUnsafe('DELETE FROM ai_learning_preferences WHERE id = $1', parseInt(id))

  await auditService.logFromRequest(request, parseInt(session.userId), 'resource_deleted', {
    entityType: 'ai_learning_preference',
    entityId: parseInt(id),
  });

  return NextResponse.json({ success: true })
})
);
