'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useVoiceRecognition } from '@/lib/hooks/useVoiceRecognition'
import { useTextToSpeech } from '@/lib/hooks/useTextToSpeech'
import { parseCommand, formatCommandDisplay, isConfidentCommand, type InspectionCommand } from '@/lib/voice/command-parser'
import { logger } from '@/lib/logger'

interface InspectionItem {
  id: string
  label: string
  category?: string
}

interface VoiceInspectorProps {
  items: InspectionItem[]
  onComplete: (results: Record<string, { status: 'pass' | 'fail'; note?: string }>) => void
  onCancel: () => void
  vehicleName?: string
  inspectionType?: 'pre_trip' | 'post_trip'
}

export function VoiceInspector({
  items,
  onComplete,
  onCancel,
  vehicleName = 'Vehicle',
  inspectionType = 'pre_trip',
}: VoiceInspectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<Record<string, { status: 'pass' | 'fail'; note?: string }>>({})
  const [lastCommand, setLastCommand] = useState<InspectionCommand | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [repeatCount, setRepeatCount] = useState(0) // Track how many times prompt has been spoken

  const currentItem = items[currentIndex]
  const progress = Math.round((currentIndex / items.length) * 100)
  const isComplete = currentIndex >= items.length

  const tts = useTextToSpeech({
    rate: 0.9,
    pitch: 1.0,
  })

  const speakCurrentItem = useCallback(async () => {
    if (!currentItem) return
    if (repeatCount >= 2) return // Stop after 2 repeats
    
    try {
      const text = `Check ${currentItem.label}. Say pass or fail.`
      await tts.speak(text)
      setRepeatCount(prev => prev + 1)
    } catch (error) {
      logger.error('TTS error', { error })
      // If TTS fails, don't keep retrying
      setRepeatCount(2) // Max out to prevent infinite retries
    }
  }, [currentItem, tts, repeatCount])

  // Speak current item when it changes (max 2 times)
  useEffect(() => {
    if (currentItem && !tts.isSpeaking && !showConfirmation && repeatCount < 2) {
      const timer = setTimeout(() => {
        speakCurrentItem()
      }, 300) // Small delay to prevent rapid repeats
      
      return () => clearTimeout(timer)
    }
  }, [currentItem, tts.isSpeaking, showConfirmation, repeatCount, speakCurrentItem])

  const voice = useVoiceRecognition({
    continuous: false,
    interimResults: true,
    onError: (error) => logger.error('Voice error', { error }),
  })

  // Define these first to avoid circular dependencies
  const goToNext = useCallback(() => {
    voice.stopListening()
    voice.resetTranscript()
    setShowConfirmation(false)
    setLastCommand(null)
    setRepeatCount(0) // Reset repeat counter for new item

    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }, [voice, currentIndex, items.length])

  const handleInspectionCommand = useCallback((command: InspectionCommand) => {
    if (!currentItem) return
    if (command.type !== 'PASS' && command.type !== 'FAIL') return

    const status = command.type === 'PASS' ? 'pass' : 'fail'
    const note = command.type === 'FAIL' ? command.note : undefined

    setResults(prev => ({
      ...prev,
      [currentItem.id]: { status, note },
    }))

    // Speak confirmation
    const confirmText = status === 'pass' ? 'Passed' : note ? `Failed: ${note}` : 'Failed'
    tts.speak(confirmText).catch(err => logger.error('TTS error', { error: err }))

    // Move to next item
    setTimeout(() => {
      if (currentIndex >= items.length - 1) {
        // Complete inspection
        handleComplete()
      } else {
        goToNext()
      }
    }, 1000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem, tts, currentIndex, items.length, goToNext])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      voice.stopListening()
      voice.resetTranscript()
      setShowConfirmation(false)
      setLastCommand(null)
      setCurrentIndex(prev => prev - 1)
    }
  }, [voice, currentIndex])

  const handleComplete = useCallback(async () => {
    voice.stopListening()
    try {
      await tts.speak('Inspection complete. Good job!')
    } catch (err) {
      logger.error('TTS error', { error: err })
    }
    setTimeout(() => {
      onComplete(results)
    }, 2000)
  }, [voice, tts, onComplete, results])

  const handleCancel = useCallback(() => {
    voice.stopListening()
    tts.stop()
    onCancel()
  }, [voice, tts, onCancel])

  const handleConfirmCommand = useCallback(() => {
    if (lastCommand && (lastCommand.type === 'PASS' || lastCommand.type === 'FAIL')) {
      handleInspectionCommand(lastCommand)
      setShowConfirmation(false)
    }
  }, [lastCommand, handleInspectionCommand])

  const handleRetry = useCallback(() => {
    setShowConfirmation(false)
    setLastCommand(null)
    voice.resetTranscript()
  }, [voice])

  const toggleListening = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening()
    } else {
      voice.startListening()
    }
  }, [voice])

  const getHelpText = useCallback(() => {
    return `Voice Commands:
• "Pass" or "OK" - Mark item as passing
• "Fail" - Mark item as failed
• "Fail, [reason]" - Mark failed with note
• "Skip" or "Next" - Skip to next item
• "Back" or "Previous" - Go to previous item
• "Stop" or "Cancel" - Stop inspection

Tips:
• Speak clearly and wait for the beep
• Say "Fail, cracked mirror" to add notes
• Tap the mic button to toggle listening`
  }, [])

  // Handle transcript with all dependencies now defined
  const handleTranscript = useCallback((transcript: string, isFinal: boolean) => {
    if (!isFinal) return

    const command = parseCommand(transcript, voice.confidence || 1.0)
    setLastCommand(command)

    // Handle command based on type
    switch (command.type) {
      case 'PASS':
      case 'FAIL':
        if (isConfidentCommand(command, 0.7)) {
          handleInspectionCommand(command)
        } else {
          // Low confidence - ask for confirmation
          setShowConfirmation(true)
        }
        break

      case 'NOTE':
        // Add note to current item
        if (currentItem) {
          setResults(prev => ({
            ...prev,
            [currentItem.id]: {
              ...prev[currentItem.id],
              note: command.text,
            },
          }))
          tts.speak('Note added').catch(err => logger.error('TTS error', { error: err }))
        }
        break

      case 'REPEAT':
        speakCurrentItem()
        break

      case 'SKIP':
        goToNext()
        break

      case 'CANCEL':
        handleCancel()
        break

      case 'HELP':
        setShowHelp(true)
        break

      case 'UNKNOWN':
        tts.speak('I didn\'t understand. Say pass, fail, or help.').catch(err => logger.error('TTS error', { error: err }))
        break
    }
  }, [currentItem, tts, speakCurrentItem, voice.confidence, handleInspectionCommand, goToNext, handleCancel])

  // Wire up the transcript handler
  useEffect(() => {
    if (voice.transcript) {
      handleTranscript(voice.transcript, !voice.isListening)
    }
  }, [voice.transcript, voice.isListening, handleTranscript])

  if (!voice.isSupported) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Voice Not Supported</h2>
          <p className="text-gray-700 mb-4">
            Your browser doesn&apos;t support voice recognition. Please use a modern browser like Chrome, Edge, or Safari.
          </p>
          <button
            onClick={onCancel}
            className="w-full bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700"
          >
            Back to Checkbox Mode
          </button>
        </div>
      </div>
    )
  }

  // Show TTS warning if not supported (but allow continuing with visual-only mode)
  const showTTSWarning = !tts.isSupported

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inspection Complete!</h2>
          <p className="text-gray-600 mb-6">
            {Object.values(results).filter(r => r.status === 'pass').length} passed, 
            {Object.values(results).filter(r => r.status === 'fail').length} failed
          </p>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500 mt-4">Processing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-900">
            {inspectionType === 'pre_trip' ? 'Pre-Trip' : 'Post-Trip'} Inspection
          </h1>
          <button
            onClick={handleCancel}
            className="text-red-600 font-medium text-sm"
          >
            Exit
          </button>
        </div>
        <p className="text-sm text-gray-600">{vehicleName} • Voice Mode</p>
      </div>

      {/* Progress */}
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {currentIndex} / {items.length}
          </span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* TTS Warning */}
        {showTTSWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 mb-1">Voice prompts unavailable</p>
                <p className="text-xs text-yellow-700">Your browser doesn&apos;t support text-to-speech. You can still use voice commands, but you won&apos;t hear audio prompts.</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Item */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-sm text-gray-500 mb-2">Checking</div>
            <h2 className="text-2xl font-bold text-gray-900">{currentItem?.label}</h2>
            <p className="text-sm text-gray-600 mt-2">Say: &quot;Pass&quot; or &quot;Fail&quot;</p>
            {repeatCount < 2 && (
              <button
                onClick={() => speakCurrentItem()}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                🔊 Repeat prompt ({2 - repeatCount} left)
              </button>
            )}
          </div>

          {/* Microphone Visualization */}
          <div className="flex justify-center mb-6">
            <button
              onClick={toggleListening}
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all transform ${
                voice.isListening
                  ? 'bg-red-500 scale-110 animate-pulse shadow-lg shadow-red-500/50'
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
              }`}
            >
              <svg
                className="w-16 h-16 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          </div>

          {/* Status */}
          <div className="text-center mb-6">
            {voice.isListening ? (
              <div className="space-y-2">
                <p className="text-lg font-medium text-red-600">🎤 Listening...</p>
                <p className="text-sm text-gray-600">Say: Pass, Fail, or Help</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">Tap microphone to speak</p>
                <p className="text-sm text-gray-500">or use buttons below</p>
              </div>
            )}
          </div>

          {/* Transcript */}
          {(voice.transcript || voice.interimTranscript) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500 mb-1">You said:</p>
              <p className="text-lg font-medium text-gray-900">
                {voice.transcript || voice.interimTranscript}
              </p>
              {voice.confidence > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Confidence: {Math.round(voice.confidence * 100)}%
                </p>
              )}
            </div>
          )}

          {/* Last Command */}
          {lastCommand && !showConfirmation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-600 font-medium">
                {formatCommandDisplay(lastCommand)}
              </p>
            </div>
          )}

          {/* Error */}
          {voice.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-600">{voice.error}</p>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirmation && lastCommand && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 border-yellow-400">
            <p className="text-lg font-medium text-gray-900 mb-4 text-center">
              Confirm your answer:
            </p>
            <p className="text-2xl font-bold text-center mb-6">
              {formatCommandDisplay(lastCommand)}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleConfirmCommand}
                className="bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600"
              >
                ✓ Confirm
              </button>
              <button
                onClick={handleRetry}
                className="bg-yellow-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-yellow-600"
              >
                ⟲ Retry
              </button>
              <button
                onClick={goToNext}
                className="bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600"
              >
                ⏭ Skip
              </button>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelp && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Voice Commands</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{getHelpText()}</pre>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="bg-gray-200 text-gray-700 py-4 rounded-xl font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ◀ Back
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="bg-blue-100 text-blue-700 py-4 rounded-xl font-medium hover:bg-blue-200"
          >
            ❓ Help
          </button>
          <button
            onClick={goToNext}
            className="bg-gray-200 text-gray-700 py-4 rounded-xl font-medium hover:bg-gray-300"
          >
            Skip ▶
          </button>
        </div>
      </div>
    </div>
  )
}

