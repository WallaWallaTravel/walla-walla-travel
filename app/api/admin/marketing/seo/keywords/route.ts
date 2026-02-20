/**
 * Admin API: SEO Keyword Mining
 *
 * GET - Returns keyword opportunities and seasonal trends from Search Console data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { socialIntelligenceService } from '@/lib/services/social-intelligence.service'
import { logger } from '@/lib/logger'
import { withErrorHandling } from '@/lib/api/middleware/error-handler'

async function verifyAdmin(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.user.role !== 'admin') {
    return null
  }
  return session
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await verifyAdmin(request)
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
  }

  const [opportunities, trends] = await Promise.all([
    socialIntelligenceService.getKeywordOpportunities(),
    socialIntelligenceService.getSeasonalKeywordTrends(),
  ])

  logger.info('Keyword mining data retrieved', {
    opportunities: opportunities.length,
    trends: trends.length,
  })

  return NextResponse.json({
    opportunities,
    trends,
    summary: {
      total_opportunities: opportunities.length,
      striking_distance: opportunities.filter(o => o.opportunity_type === 'striking_distance').length,
      question_keywords: opportunities.filter(o => o.opportunity_type === 'question_keyword').length,
      trending_up: trends.length,
    },
  })
});
