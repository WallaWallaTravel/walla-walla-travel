import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { transcribeAudio } from '@/lib/services/deepgram'
import { withRateLimit, rateLimiters } from '@/lib/api/middleware/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/voice/transcribe
 *
 * Transcribe audio file to text using Deepgram
 * Rate limited to 10 per minute to control API costs
 *
 * Accepts: multipart/form-data with 'audio' file
 * Returns: { transcript, confidence, duration, cost }
 */
export const POST = withRateLimit(rateLimiters.transcription)(async (request: NextRequest) => {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file too large (max 10MB)' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Transcribe using Deepgram
    const result = await transcribeAudio(buffer, {
      language: 'en-US',
      model: 'nova-2',
      punctuate: true
    })

    // Log for monitoring
    logger.info('Voice transcribed', { duration: result.duration, transcript: result.transcript.substring(0, 50) })

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
      duration: result.duration,
      cost: result.cost,
      words: result.words
    })

  } catch (error) {
    logger.error('Transcription error', { error })
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Transcription failed',
        details: message
      },
      { status: 500 }
    )
  }
});

