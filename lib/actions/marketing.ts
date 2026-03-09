'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import {
  CreateEmailCampaignSchema,
  type CreateEmailCampaignInput,
} from '@/lib/schemas/admin'

// ============================================================================
// TYPES
// ============================================================================

export type MarketingActionResult = {
  success: boolean
  data?: unknown
  error?: string | Record<string, string[]>
}

// ============================================================================
// EMAIL CAMPAIGN MUTATIONS (no Prisma model — raw queries)
// ============================================================================

export async function createEmailCampaign(
  data: CreateEmailCampaignInput
): Promise<MarketingActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  const parsed = CreateEmailCampaignSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const v = parsed.data

  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      `INSERT INTO email_campaigns (
        name, subject, preview_text, campaign_type,
        template_id, content_html, content_json,
        status, scheduled_for, recipient_list_ids,
        recipients_count, opened_count, clicked_count,
        bounced_count, unsubscribed_count,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb, 'draft', $8, $9::int[],
        0, 0, 0, 0, 0, $10, NOW(), NOW()
      ) RETURNING id`,
      v.name,
      v.subject,
      v.preview_text || null,
      v.campaign_type || 'promotional',
      v.template_id || null,
      v.content_html || null,
      v.content_json ? JSON.stringify(v.content_json) : null,
      v.scheduled_for || null,
      v.recipient_list_ids || [],
      v.created_by || null
    )

    return { success: true, data: { id: rows[0]?.id } }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create email campaign'
    return { success: false, error: message }
  }
}

// ============================================================================
// MARKETING CAMPAIGN MUTATIONS (marketing_campaigns has Prisma model)
// ============================================================================

export async function createMarketingCampaign(input: {
  name: string
  description?: string
  theme: string
  status?: string
  start_date: string
  end_date: string
  channels: string[]
  target_audience?: string
  auto_generated?: boolean
}): Promise<MarketingActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const userId = session.user.id

    const campaign = await prisma.marketing_campaigns.create({
      data: {
        name: input.name,
        description: input.description || null,
        theme: input.theme,
        status: input.status || 'draft',
        start_date: new Date(input.start_date),
        end_date: new Date(input.end_date),
        channels: input.channels,
        target_audience: input.target_audience || null,
        auto_generated: input.auto_generated ?? false,
        created_by: userId || null,
      },
    })

    return { success: true, data: { id: campaign.id } }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to create marketing campaign'
    return { success: false, error: message }
  }
}

export async function updateMarketingCampaignStatus(
  id: number,
  status: string
): Promise<MarketingActionResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await prisma.marketing_campaigns.update({
      where: { id },
      data: {
        status,
        updated_at: new Date(),
      },
    })

    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update campaign status'
    return { success: false, error: message }
  }
}
