# Voice Recognition for iOS - Implementation Plan
**Created:** November 8, 2025  
**Goal:** Enable voice-driven inspections on iOS devices

---

## Chosen Solution: Server-Side Voice Processing

**Why:** Works on all devices, fast to implement, no app store required.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  iOS Safari / Chrome (Any Browser)         │
│  - MediaRecorder API (audio capture)       │
│  - Send audio chunks to server              │
│  - Display transcription results            │
└─────────────────────────────────────────────┘
                    ↓ Audio (WebM/MP3)
┌─────────────────────────────────────────────┐
│  Next.js API Route                          │
│  /api/voice/transcribe                      │
│  - Receive audio file                       │
│  - Send to Deepgram/Google Cloud            │
│  - Return transcription                     │
└─────────────────────────────────────────────┘
                    ↓ Audio
┌─────────────────────────────────────────────┐
│  Speech-to-Text Service (Deepgram)         │
│  - Process audio                            │
│  - Return text transcription                │
│  - Confidence scores                        │
└─────────────────────────────────────────────┘
                    ↓ Text
┌─────────────────────────────────────────────┐
│  Command Parser (Existing)                 │
│  - Parse "pass", "fail", "repeat", etc.    │
│  - Same logic as current voice inspector   │
└─────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Audio Recording (Day 1 - 8 hours)

#### Create Audio Recorder Hook
```typescript
// lib/hooks/useAudioRecorder.ts
import { useState, useRef } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)

    } catch (error) {
      console.error('Failed to start recording:', error)
      throw error
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    isSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }
}
```

### Phase 2: API Endpoint (Day 1 - 4 hours)

#### Create Transcription Endpoint
```typescript
// app/api/voice/transcribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@deepgram/sdk'

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Get audio from request
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Convert to buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Transcribe with Deepgram
    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      {
        model: 'nova-2',
        language: 'en',
        punctuate: false,
        diarize: false,
        smart_format: false,
      }
    )

    const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || ''
    const confidence = result.results?.channels[0]?.alternatives[0]?.confidence || 0

    return NextResponse.json({
      success: true,
      transcript,
      confidence
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
```

### Phase 3: Voice Inspector Component (Day 2 - 8 hours)

#### Update VoiceInspector for iOS
```typescript
// components/inspections/VoiceInspectorUniversal.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder'
import { parseCommand } from '@/lib/voice/command-parser'
import { useTextToSpeech } from '@/lib/hooks/useTextToSpeech'

export function VoiceInspectorUniversal({ items, onComplete, onCancel }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  
  const recorder = useAudioRecorder()
  const tts = useTextToSpeech()
  
  const currentItem = items[currentIndex]

  // Speak current item
  useEffect(() => {
    if (currentItem) {
      tts.speak(`Check ${currentItem.label}. Say pass or fail.`)
    }
  }, [currentItem])

  const handleRecord = async () => {
    if (recorder.isRecording) {
      // Stop recording and transcribe
      recorder.stopRecording()
      
      if (recorder.audioBlob) {
        setIsProcessing(true)
        
        try {
          // Send to server for transcription
          const formData = new FormData()
          formData.append('audio', recorder.audioBlob, 'recording.webm')
          
          const response = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData
          })
          
          const data = await response.json()
          
          if (data.success) {
            // Parse command
            const command = parseCommand(data.transcript, data.confidence)
            handleCommand(command)
          }
        } catch (error) {
          console.error('Transcription failed:', error)
          tts.speak('Sorry, I could not understand. Please try again.')
        } finally {
          setIsProcessing(false)
        }
      }
    } else {
      // Start recording
      await recorder.startRecording()
    }
  }

  const handleCommand = (command) => {
    if (command.type === 'PASS' || command.type === 'FAIL') {
      setResults(prev => ({
        ...prev,
        [currentItem.id]: {
          status: command.type.toLowerCase(),
          note: command.note
        }
      }))
      
      tts.speak(command.type === 'PASS' ? 'Passed' : 'Failed')
      
      // Move to next
      setTimeout(() => {
        if (currentIndex < items.length - 1) {
          setCurrentIndex(prev => prev + 1)
        } else {
          onComplete(results)
        }
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          Voice Inspection (iOS Compatible)
        </h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-4">
          <h2 className="text-xl mb-2">{currentItem?.label}</h2>
          <p className="text-gray-400">
            {currentIndex + 1} of {items.length}
          </p>
        </div>

        <button
          onClick={handleRecord}
          disabled={isProcessing}
          className={`w-full py-6 rounded-lg font-bold text-xl ${
            recorder.isRecording
              ? 'bg-red-600 animate-pulse'
              : isProcessing
              ? 'bg-gray-600'
              : 'bg-blue-600'
          }`}
        >
          {isProcessing
            ? '⏳ Processing...'
            : recorder.isRecording
            ? '🔴 Stop Recording'
            : '🎤 Tap to Record'
          }
        </button>

        <div className="mt-4 text-sm text-gray-400 text-center">
          <p>Tap and hold the button</p>
          <p>Say "Pass" or "Fail"</p>
          <p>Release when done</p>
        </div>
      </div>
    </div>
  )
}
```

### Phase 4: Testing & Polish (Day 3 - 4 hours)

- [ ] Test on iOS Safari
- [ ] Test on iOS Chrome
- [ ] Test on Android Chrome
- [ ] Test offline behavior
- [ ] Add error messages
- [ ] Add loading states
- [ ] Test with poor network

---

## Service Setup

### Deepgram (Recommended)

1. **Sign up:** https://deepgram.com
2. **Get API key:** Dashboard → API Keys
3. **Add to .env:**
   ```
   DEEPGRAM_API_KEY=your_key_here
   ```

### Pricing
- Free tier: 45,000 minutes/year ($200 credit)
- Pay-as-you-go: $0.0043/minute
- **Typical usage:** 1000 inspections/month = 500 minutes = $2.15/month

---

## Alternative: Google Cloud Speech

### Setup
```bash
npm install @google-cloud/speech
```

### Configuration
```typescript
import speech from '@google-cloud/speech'

const client = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
})
```

### Pricing
- Free tier: 60 minutes/month
- $0.006/15 seconds after that
- **Typical usage:** $15-30/month

---

## Deployment Checklist

### Before Deploying
- [ ] API key added to Railway environment variables
- [ ] Test on production build
- [ ] Test on iOS device
- [ ] Error handling added
- [ ] Loading states added
- [ ] Fallback to checkbox mode working

### After Deploying
- [ ] Verify API endpoint works
- [ ] Check API usage/billing
- [ ] Monitor error rates
- [ ] Collect user feedback

---

## Estimated Costs

### Development
- **Time:** 2-3 days (16-24 hours)
- **Cost:** $2,400-$3,600 (at $150/hour)

### Ongoing
- **API costs:** $10-50/month
- **Maintenance:** 2-4 hours/month

### Total First Month
- Development: $2,400-$3,600
- API: $10-50
- **Total: ~$2,500-$3,650**

### ROI
- Enables voice features for ALL users (not just Android)
- Better UX = faster inspections
- Professional speech recognition
- Scalable solution

---

## Timeline

```
Day 1 (8 hours):
- Morning: Set up Deepgram account, create audio recorder hook
- Afternoon: Build API endpoint, test transcription

Day 2 (8 hours):
- Morning: Update VoiceInspector component
- Afternoon: Integration testing, error handling

Day 3 (4 hours):
- Morning: Mobile device testing (iOS + Android)
- Afternoon: Polish, deploy to production
```

---

## Next Steps

**To proceed:**

1. **Choose service:** Deepgram (recommended) or Google Cloud
2. **Get API key:** Sign up and obtain credentials
3. **Set timeline:** When do you want this live?
4. **Budget approval:** ~$2,500-$3,650 for full implementation

**Want me to start building this?**

I can have a working prototype in a few hours if you provide:
- Deepgram API key (or I can use a test key initially)
- Go-ahead to proceed

