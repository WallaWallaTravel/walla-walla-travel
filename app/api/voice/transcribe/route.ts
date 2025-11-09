import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/services/deepgram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/voice/transcribe
 * 
 * Transcribe audio file to text using Deepgram
 * 
 * Accepts: multipart/form-data with 'audio' file
 * Returns: { transcript, confidence, duration, cost }
 */
export async function POST(request: NextRequest) {
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
    console.log(`[Voice] Transcribed ${result.duration}s audio: "${result.transcript.substring(0, 50)}..."`)

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
      duration: result.duration,
      cost: result.cost,
      words: result.words
    })

  } catch (error: any) {
    console.error('Transcription error:', error)
    
    return NextResponse.json(
      { 
        error: 'Transcription failed',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

