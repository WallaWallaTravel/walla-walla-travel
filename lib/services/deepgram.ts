// Deepgram Voice Transcription Service

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY

if (!DEEPGRAM_API_KEY) {
  console.warn('⚠️ DEEPGRAM_API_KEY not set - voice transcription will not work')
}

export interface TranscriptionResult {
  transcript: string
  confidence: number
  words?: Array<{
    word: string
    start: number
    end: number
    confidence: number
  }>
  duration: number
  cost: number
}

export interface TranscriptionOptions {
  language?: string
  model?: string
  punctuate?: boolean
  diarize?: boolean
}

/**
 * Transcribe audio file to text using Deepgram
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY is not configured')
  }

  const deepgram = createClient(DEEPGRAM_API_KEY)

  const {
    language = 'en-US',
    model = 'nova-2',
    punctuate = true,
    diarize = false
  } = options

  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model,
        language,
        punctuate,
        diarize,
        smart_format: true,
        utterances: false
      }
    )

    if (error) {
      throw new Error(`Deepgram error: ${error.message}`)
    }

    const channel = result.results?.channels?.[0]
    const alternative = channel?.alternatives?.[0]

    if (!alternative || !alternative.transcript) {
      throw new Error('No transcription result')
    }

    // Calculate cost (Deepgram pricing: $0.0043 per minute)
    const durationSeconds = result.metadata?.duration || 0
    const durationMinutes = durationSeconds / 60
    const cost = durationMinutes * 0.0043

    return {
      transcript: alternative.transcript,
      confidence: alternative.confidence || 0,
      words: alternative.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence
      })),
      duration: durationSeconds,
      cost
    }
  } catch (error) {
    console.error('Deepgram transcription error:', error)
    throw error
  }
}

/**
 * Estimate cost for audio transcription
 */
export function estimateTranscriptionCost(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60
  return durationMinutes * 0.0043
}

