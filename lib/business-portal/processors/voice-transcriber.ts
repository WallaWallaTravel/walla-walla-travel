/**
 * Voice Transcription Processor
 * Uses Deepgram to transcribe voice recordings
 */

import { query } from '@/lib/db';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export interface TranscriptionResult {
  transcription: string;
  confidence: number;
  duration: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

/**
 * Transcribe audio using Deepgram
 */
export async function transcribeAudio(audioData: string | Buffer): Promise<TranscriptionResult> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY not configured');
  }

  console.log('[Voice Transcriber] Starting transcription...');

  try {
    // Convert data URL to buffer if needed
    let audioBuffer: Buffer;
    if (typeof audioData === 'string') {
      // Remove data URL prefix if present
      const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(base64Data, 'base64');
    } else {
      audioBuffer = audioData;
    }

    // Call Deepgram API
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&utterances=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm'
      },
      body: audioBuffer as unknown as BodyInit
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    // Extract transcription data
    const channel = result.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];
    
    if (!alternative?.transcript) {
      throw new Error('No transcription returned from Deepgram');
    }

    const transcription: TranscriptionResult = {
      transcription: alternative.transcript,
      confidence: alternative.confidence || 0,
      duration: result.metadata?.duration || 0,
      words: alternative.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence
      }))
    };

    console.log('[Voice Transcriber] Transcription complete:', transcription.transcription.substring(0, 100) + '...');
    
    return transcription;

  } catch (error: any) {
    console.error('[Voice Transcriber] Error:', error);
    throw error;
  }
}

/**
 * Process a voice entry from the database
 */
export async function processVoiceEntry(voiceEntryId: number): Promise<TranscriptionResult> {
  console.log('[Voice Transcriber] Processing voice entry:', voiceEntryId);

  // Get the voice entry
  const result = await query(
    'SELECT audio_url, audio_duration_seconds FROM business_voice_entries WHERE id = $1',
    [voiceEntryId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Voice entry ${voiceEntryId} not found`);
  }

  const voiceEntry = result.rows[0];
  
  if (!voiceEntry.audio_url) {
    throw new Error(`Voice entry ${voiceEntryId} has no audio URL`);
  }

  // Transcribe the audio
  const transcription = await transcribeAudio(voiceEntry.audio_url);

  // Update the voice entry with transcription
  await query(`
    UPDATE business_voice_entries
    SET 
      transcription = $2,
      transcription_confidence = $3,
      transcribed_at = NOW()
    WHERE id = $1
  `, [voiceEntryId, transcription.transcription, transcription.confidence]);

  console.log('[Voice Transcriber] Updated voice entry with transcription');

  return transcription;
}

/**
 * Get estimated cost for transcription
 */
export function estimateTranscriptionCost(durationSeconds: number): number {
  // Deepgram pricing: $0.0043 per minute for Nova-2 model
  const minutes = durationSeconds / 60;
  return minutes * 0.0043;
}

