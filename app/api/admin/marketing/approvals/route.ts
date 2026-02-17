/**
 * Content Approvals API
 *
 * Tracks admin approval/editing/rejection of AI-generated content.
 * Feeds data back into the AI learning system.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { logger } from '@/lib/logger'

interface ApprovalRequest {
  contentType: 'social_post' | 'email' | 'blog' | 'page_update' | 'campaign'
  contentId: number
  action: 'approved' | 'edited' | 'rejected'
  originalContent: string
  finalContent?: string
  platform?: string
  contentCategory?: string
  tone?: string
  notes?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get('contentType')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '50')

    let queryText = `
      SELECT
        ca.*,
        u.name as approver_name
      FROM content_approvals ca
      LEFT JOIN users u ON ca.approved_by = u.id
      WHERE 1=1
    `
    const params: (string | number)[] = []

    if (contentType) {
      params.push(contentType)
      queryText += ` AND ca.content_type = $${params.length}`
    }

    if (action) {
      params.push(action)
      queryText += ` AND ca.action = $${params.length}`
    }

    params.push(limit)
    queryText += ` ORDER BY ca.created_at DESC LIMIT $${params.length}`

    const result = await query(queryText, params)

    // Get approval stats
    const statsResult = await query<{
      total: number
      approved: number
      edited: number
      rejected: number
    }>(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE action = 'approved')::int as approved,
        COUNT(*) FILTER (WHERE action = 'edited')::int as edited,
        COUNT(*) FILTER (WHERE action = 'rejected')::int as rejected
      FROM content_approvals
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `)

    return NextResponse.json({
      approvals: result.rows,
      stats: statsResult.rows[0] || { total: 0, approved: 0, edited: 0, rejected: 0 },
    })
  } catch (error) {
    logger.error('Failed to fetch approvals', { error })
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ApprovalRequest = await request.json()
    const {
      contentType,
      contentId,
      action,
      originalContent,
      finalContent,
      platform,
      contentCategory,
      tone,
      notes,
    } = body

    if (!contentType || !contentId || !action || !originalContent) {
      return NextResponse.json(
        { error: 'Missing required fields: contentType, contentId, action, originalContent' },
        { status: 400 }
      )
    }

    // Compute edit diff if content was edited
    let editDiff: string | null = null
    if (action === 'edited' && finalContent) {
      editDiff = computeSimpleDiff(originalContent, finalContent)
    }

    // Record the approval
    const result = await query<{ id: number }>(`
      INSERT INTO content_approvals (
        content_type, content_id, action,
        original_content, final_content, edit_diff,
        platform, content_category, tone,
        notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING id
    `, [
      contentType,
      contentId,
      action,
      originalContent,
      finalContent || null,
      editDiff,
      platform || null,
      contentCategory || null,
      tone || null,
      notes || null,
    ])

    // Update learning preferences based on this approval
    await updateLearningPreferences(action, originalContent, finalContent, platform, contentCategory)

    logger.info('Content approval recorded', {
      id: result.rows[0].id,
      contentType,
      contentId,
      action,
    })

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      message: `Content ${action} recorded`,
    })
  } catch (error) {
    logger.error('Failed to record approval', { error })
    return NextResponse.json(
      { error: 'Failed to record approval' },
      { status: 500 }
    )
  }
}

function computeSimpleDiff(original: string, final: string): string {
  const originalLines = original.split('\n')
  const finalLines = final.split('\n')
  const diffs: string[] = []

  const maxLen = Math.max(originalLines.length, finalLines.length)
  for (let i = 0; i < maxLen; i++) {
    const orig = originalLines[i]
    const fin = finalLines[i]
    if (orig !== fin) {
      if (orig && fin) {
        diffs.push(`- ${orig}`)
        diffs.push(`+ ${fin}`)
      } else if (orig) {
        diffs.push(`- ${orig}`)
      } else if (fin) {
        diffs.push(`+ ${fin}`)
      }
    }
  }

  return diffs.join('\n')
}

async function updateLearningPreferences(
  action: string,
  originalContent: string,
  finalContent: string | undefined,
  platform: string | undefined | null,
  contentCategory: string | undefined | null
): Promise<void> {
  try {
    if (action === 'rejected') {
      // Learn from rejections — track what content types get rejected
      const pattern = `Rejected ${contentCategory || 'general'} content`
      await upsertPreference('rejection_pattern', platform || null, pattern)
    }

    if (action === 'edited' && finalContent) {
      // Learn from edits — analyze what was changed
      const origLen = originalContent.length
      const finalLen = finalContent.length

      // Track length preference
      if (finalLen < origLen * 0.7) {
        await upsertPreference('length', platform || null, 'Prefers shorter content — edits frequently shorten posts')
      } else if (finalLen > origLen * 1.3) {
        await upsertPreference('length', platform || null, 'Prefers longer content — edits frequently expand posts')
      }

      // Track emoji usage changes
      const origEmojis = (originalContent.match(/[\u{1F600}-\u{1F9FF}]/gu) || []).length
      const finalEmojis = (finalContent.match(/[\u{1F600}-\u{1F9FF}]/gu) || []).length
      if (finalEmojis < origEmojis) {
        await upsertPreference('emoji_usage', platform || null, 'Removes emojis from AI content — prefers fewer emojis')
      } else if (finalEmojis > origEmojis) {
        await upsertPreference('emoji_usage', platform || null, 'Adds more emojis — prefers emoji-rich content')
      }
    }

    if (action === 'approved') {
      // Learn from approvals — reinforce what works
      if (contentCategory) {
        await upsertPreference('topic_preference', platform || null, `Approves ${contentCategory} content readily`)
      }
    }
  } catch (error) {
    logger.warn('Failed to update learning preferences', { error })
  }
}

async function upsertPreference(
  preferenceType: string,
  platform: string | null,
  pattern: string
): Promise<void> {
  // Check if this preference already exists
  const existing = await query<{ id: number; learned_from_count: number; confidence_score: number }>(`
    SELECT id, learned_from_count, confidence_score
    FROM ai_learning_preferences
    WHERE preference_type = $1
      AND COALESCE(platform, '') = COALESCE($2, '')
      AND pattern = $3
    LIMIT 1
  `, [preferenceType, platform, pattern])

  if (existing.rows.length > 0) {
    const row = existing.rows[0]
    const newCount = row.learned_from_count + 1
    // Increase confidence as we see more examples (caps at 0.95)
    const newConfidence = Math.min(0.95, row.confidence_score + 0.05)
    await query(`
      UPDATE ai_learning_preferences
      SET learned_from_count = $1,
          confidence_score = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [newCount, newConfidence, row.id])
  } else {
    await query(`
      INSERT INTO ai_learning_preferences (
        preference_type, platform, pattern,
        confidence_score, learned_from_count,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, 0.50, 1, true, NOW(), NOW())
    `, [preferenceType, platform, pattern])
  }
}
