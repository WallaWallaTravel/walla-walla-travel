import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { updateQueryRating } from '@/lib/analytics/query-logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/feedback
 * 
 * Submit user feedback for an AI query
 */
export async function POST(request: NextRequest) {
  try {
    const { queryId, rating, feedback } = await request.json()

    if (!queryId || typeof queryId !== 'number') {
      return NextResponse.json(
        { error: 'Query ID is required' },
        { status: 400 }
      )
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    await updateQueryRating(queryId, rating, feedback || null)

    logger.info('Feedback received', { queryId, rating })

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted'
    })

  } catch (error) {
    logger.error('Feedback error', { error })
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to submit feedback',
        details: message
      },
      { status: 500 }
    )
  }
}

