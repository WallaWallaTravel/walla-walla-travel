import { NextRequest, NextResponse } from 'next/server'
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

    console.log(`[Feedback] Query ${queryId} rated ${rating}/5`)

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted'
    })

  } catch (error: any) {
    console.error('Feedback error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to submit feedback',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

