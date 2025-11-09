'use client'

import { useState } from 'react'
import { useAudioRecorder } from '@/lib/hooks/useAudioRecorder'

export default function VoiceTranscriptionTestPage() {
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionCost, setTranscriptionCost] = useState<number | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)
  
  const {
    isRecording,
    duration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    clearRecording
  } = useAudioRecorder()

  const handleTranscribe = async () => {
    if (!audioBlob) return

    setIsTranscribing(true)
    setTranscript('')
    setTranscriptionCost(null)
    setConfidence(null)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setTranscript(data.transcript)
        setTranscriptionCost(data.cost)
        setConfidence(data.confidence)
      } else {
        alert('Transcription failed: ' + data.error)
      }
    } catch (err: any) {
      console.error('Transcription error:', err)
      alert('Failed to transcribe: ' + err.message)
    } finally {
      setIsTranscribing(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎤 Voice Transcription Test
          </h1>
          <p className="text-gray-600 mb-8">
            Test Deepgram voice-to-text integration (iOS compatible!)
          </p>

          {/* Recording Section */}
          <div className="border-2 border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Step 1: Record Audio
            </h2>

            <div className="flex items-center justify-center mb-4">
              {isRecording && (
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xl font-mono text-gray-900">
                    {formatDuration(duration)}
                  </span>
                </div>
              )}
              {!isRecording && audioBlob && (
                <span className="text-green-600 font-medium">
                  ✓ Recording complete ({duration}s)
                </span>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              {!isRecording && !audioBlob && (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Start Recording
                </button>
              )}

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                >
                  Stop Recording
                </button>
              )}

              {!isRecording && audioBlob && (
                <>
                  <button
                    onClick={clearRecording}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={startRecording}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Record Again
                  </button>
                </>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Transcription Section */}
          <div className="border-2 border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Step 2: Transcribe
            </h2>

            <button
              onClick={handleTranscribe}
              disabled={!audioBlob || isTranscribing}
              className={`w-full py-3 rounded-lg font-medium transition ${
                audioBlob && !isTranscribing
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
            </button>
          </div>

          {/* Results Section */}
          {transcript && (
            <div className="border-2 border-green-200 bg-green-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                ✅ Transcription Result
              </h2>
              
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-gray-900 text-lg leading-relaxed">
                  "{transcript}"
                </p>
              </div>

              <div className="flex gap-4 text-sm text-gray-600">
                {confidence !== null && (
                  <div>
                    <span className="font-semibold">Confidence:</span>{' '}
                    {(confidence * 100).toFixed(1)}%
                  </div>
                )}
                {transcriptionCost !== null && (
                  <div>
                    <span className="font-semibold">Cost:</span>{' '}
                    ${transcriptionCost.toFixed(4)}
                  </div>
                )}
                <div>
                  <span className="font-semibold">Duration:</span>{' '}
                  {duration}s
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">
              🧪 Testing Checklist
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ Voice recording works</li>
              <li>✓ Deepgram transcription API works</li>
              <li>✓ Cost tracking works</li>
              <li>✓ Confidence scoring works</li>
            </ul>
          </div>
        </div>

        {/* Browser Info */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Browser: {navigator.userAgent}</p>
          <p className="mt-1">
            MediaRecorder supported:{' '}
            {typeof MediaRecorder !== 'undefined' ? '✅ Yes' : '❌ No'}
          </p>
        </div>
      </div>
    </div>
  )
}

