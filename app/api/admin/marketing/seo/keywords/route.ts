/**
 * Admin API: SEO Keyword Mining
 *
 * GET - Returns keyword opportunities and seasonal trends from Search Console data
 */

import { NextRequest, NextResponse } from 'next/server'
import { socialIntelligenceService } from '@/lib/services/social-intelligence.service'
import { logger } from '@/lib/logger'
import { withAdminAuth } from '@/lib/api/middleware/auth-wrapper'

export const GET = withAdminAuth(async (_request: NextRequest, _session) => {
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
