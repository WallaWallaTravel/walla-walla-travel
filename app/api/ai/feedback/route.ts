import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { updateQueryRating } from '@/lib/analytics/query-logger'
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/feedback
 *
 * Submit user feedback for an AI query
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { queryId, rating, feedback } = await request.json()

  if (!queryId || typeof queryId !== 'number') {
    throw new BadRequestError('Query ID is required')
  }

  if (!rating || rating < 1 || rating > 5) {
    throw new BadRequestError('Rating must be between 1 and 5')
  }

  await updateQueryRating(queryId, rating, feedback || null)

  logger.info('Feedback received', { queryId, rating })

  return NextResponse.json({
    success: true,
    message: 'Feedback submitted'
  })
})
