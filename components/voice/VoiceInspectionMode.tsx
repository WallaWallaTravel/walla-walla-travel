'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useVoiceRecognition } from '@/lib/voice/use-voice-recognition'
import { useTTS, formatForTTS } from '@/lib/voice/use-tts'
import { InspectionCommand, getHelpText, formatCommandDisplay } from '@/lib/voice/command-parser'
import { haptics } from '@/components/mobile'

interface InspectionItem {
  id: string
  category: string
  text: string
  checked: boolean
}

interface VoiceInspectionModeProps {
  items: InspectionItem[]
  onItemCheck: (id: string, checked: boolean, note?: string) => void
  onComplete: () => void
  onCancel: () => void
  onModeChange?: (mode: 'voice' | 'manual') => void
}

export function VoiceInspectionMode({
  items,
  onItemCheck,
  onComplete,
  onCancel,
  onModeChange,
}: VoiceInspectionModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [processingCommand, setProcessingCommand] = useState(false)
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState<InspectionCommand | null>(null)
  
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const currentItem = items[currentIndex]
  const progress = items.filter(i => i.checked).length
  const total = items.length
  const isComplete = progress === total

  // TTS hook
  const tts = useTTS({
    rate: 0.9,
    onEnd: () => {
      // Start listening after TTS finishes
      if (!isComplete) {
        setTimeout(() => {
          startListening()
        }, 300)
      }
    },
  })

  // Handle voice command
  const handleVoiceResult = useCallback((command: InspectionCommand, transcript: string) => {
    console.log('[VoiceMode] Command:', command, 'Transcript:', transcript)
    
    setLastCommand(command)
    setProcessingCommand(true)
    
    // Clear any existing feedback timeout
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
    }

    switch (command.type) {
      case 'PASS':
        haptics.success()
        setCommandFeedback('✓ Pass')
        onItemCheck(currentItem.id, true)
        
        // Move to next item
        if (currentIndex < items.length - 1) {
          setTimeout(() => {
            const nextIndex = currentIndex + 1
            setCurrentIndex(nextIndex)
            // Read next item
            tts.speak(formatForTTS(items[nextIndex].text))
          }, 500)
        } else {
          // All items complete
          setTimeout(() => {
            tts.speak('All items complete. Say "done" to finish or "back" to review.')
          }, 500)
        }
        break

      case 'FAIL':
        haptics.error()
        setCommandFeedback(command.note ? `✗ Fail: ${command.note}` : '✗ Fail')
        onItemCheck(currentItem.id, false, command.note)
        
        // Move to next item
        if (currentIndex < items.length - 1) {
          setTimeout(() => {
            const nextIndex = currentIndex + 1
            setCurrentIndex(nextIndex)
            tts.speak(formatForTTS(items[nextIndex].text))
          }, 800)
        } else {
          setTimeout(() => {
            tts.speak('All items complete with issues noted. Say "done" to finish.')
          }, 500)
        }
        break

      case 'REPEAT':
        haptics.light()
        setCommandFeedback('🔁 Repeating...')
        tts.speak(formatForTTS(currentItem.text))
        break

      case 'SKIP':
        haptics.light()
        if (currentIndex < items.length - 1) {
          setCommandFeedback('⏭️ Skipping...')
          const nextIndex = currentIndex + 1
          setCurrentIndex(nextIndex)
          tts.speak(formatForTTS(items[nextIndex].text))
        } else {
          tts.speak('This is the last item.')
        }
        break

      case 'CANCEL':
        haptics.warning()
        setCommandFeedback('Exiting voice mode...')
        tts.speak('Switching to manual mode.')
        setTimeout(() => {
          onModeChange?.('manual')
        }, 1500)
        break

      case 'HELP':
        haptics.light()
        setShowHelp(true)
        tts.speak('Here are the available commands. Say pass, fail, repeat, skip, or cancel.')
        break

      case 'NOTE':
        haptics.light()
        setCommandFeedback(`📝 Note: ${command.text}`)
        // Add note to current item
        onItemCheck(currentItem.id, currentItem.checked, command.text)
        setTimeout(() => {
          tts.speak('Note added.')
        }, 300)
        break

      case 'UNKNOWN':
        haptics.warning()
        setCommandFeedback(`❓ Didn't understand: "${command.original}"`)
        setTimeout(() => {
          tts.speak('I didn\'t understand. Say pass, fail, or repeat.')
        }, 300)
        break
    }

    // Clear feedback after delay
    feedbackTimeoutRef.current = setTimeout(() => {
      setCommandFeedback(null)
      setProcessingCommand(false)
    }, 2000)
  }, [currentItem, currentIndex, items, onItemCheck, onModeChange, tts])

  // Voice recognition hook
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
  } = useVoiceRecognition({
    continuous: false, // We'll restart after each command
    onResult: handleVoiceResult,
    onError: (error) => {
      console.error('[VoiceMode] Error:', error)
      setCommandFeedback(`⚠️ ${error}`)
      haptics.error()
    },
  })

  // Start voice mode - read first item
  useEffect(() => {
    if (tts.isSupported && currentItem) {
      const intro = `Voice inspection mode. ${total} items to check. Say pass, fail, or repeat.`
      tts.speak(intro)
      
      setTimeout(() => {
        tts.speak(formatForTTS(currentItem.text))
      }, 3000)
    }

    return () => {
      tts.stop()
      stopListening()
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle complete
  const handleComplete = () => {
    tts.stop()
    stopListening()
    onComplete()
  }

  // Handle switch to manual
  const handleSwitchToManual = () => {
    tts.stop()
    stopListening()
    onModeChange?.('manual')
  }

  if (!isSupported && !tts.isSupported) {
    return (
      <div className="fixed inset-0 bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🎤</div>
          <h2 className="text-xl font-bold mb-4">Voice Mode Not Available</h2>
          <p className="text-gray-400 mb-6">
            Your browser doesn't support voice recognition. Please use a modern browser like Chrome.
          </p>
          <button
            onClick={() => onModeChange?.('manual')}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium"
          >
            Use Manual Mode
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col z-50">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            isListening ? 'bg-green-500 animate-pulse' : 
            tts.isSpeaking ? 'bg-blue-500' : 'bg-gray-600'
          }`} />
          <span className="text-sm text-gray-400">
            {isListening ? 'Listening...' : tts.isSpeaking ? 'Speaking...' : 'Ready'}
          </span>
        </div>
        
        <div className="text-right">
          <span className="text-lg font-bold">{progress}/{total}</span>
          <div className="text-xs text-gray-400">Items checked</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-700">
        <div 
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${(progress / total) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Current item */}
        {!isComplete ? (
          <>
            <div className="text-sm text-gray-400 mb-2 uppercase tracking-wide">
              {currentItem?.category || 'Inspection Item'}
            </div>
            
            <h2 className="text-2xl font-bold mb-6 leading-relaxed">
              {currentItem?.text || 'Loading...'}
            </h2>

            {/* Item number */}
            <div className="text-gray-500 mb-8">
              Item {currentIndex + 1} of {total}
            </div>
          </>
        ) : (
          <div className="mb-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">All Items Complete!</h2>
            <p className="text-gray-400">
              {progress} items checked
            </p>
          </div>
        )}

        {/* Voice feedback */}
        {commandFeedback && (
          <div className={`text-xl font-bold mb-6 ${
            commandFeedback.startsWith('✓') ? 'text-green-400' :
            commandFeedback.startsWith('✗') ? 'text-red-400' :
            commandFeedback.startsWith('⚠') ? 'text-yellow-400' :
            'text-blue-400'
          }`}>
            {commandFeedback}
          </div>
        )}

        {/* Interim transcript */}
        {interimTranscript && (
          <div className="text-gray-400 italic mb-4">
            "{interimTranscript}"
          </div>
        )}

        {/* Listening indicator */}
        {isListening && (
          <div className="flex items-center gap-2 mb-6">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-green-500 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 20}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-green-400 text-sm ml-2">Listening...</span>
          </div>
        )}

        {/* Voice error */}
        {voiceError && (
          <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg mb-6">
            {voiceError}
          </div>
        )}
      </div>

      {/* Quick commands hint */}
      <div className="px-4 pb-2">
        <div className="flex justify-center gap-4 text-sm text-gray-500">
          <span>🎤 "Pass"</span>
          <span>🎤 "Fail"</span>
          <span>🎤 "Repeat"</span>
          <span>🎤 "Help"</span>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="bg-gray-800 px-4 py-4 space-y-3">
        <div className="flex gap-3">
          {!isListening ? (
            <button
              onClick={startListening}
              disabled={tts.isSpeaking}
              className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2"
            >
              <span className="text-2xl">🎤</span>
              <span>Start Listening</span>
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2"
            >
              <span className="text-2xl">⏹️</span>
              <span>Stop</span>
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSwitchToManual}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium"
          >
            ☑️ Switch to Manual
          </button>
          
          {isComplete && (
            <button
              onClick={handleComplete}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
            >
              ✓ Complete
            </button>
          )}
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50"
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4 text-center">Voice Commands</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <div className="font-medium">Pass / Good / OK</div>
                  <div className="text-gray-400">Mark item as checked</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl">✗</span>
                <div>
                  <div className="font-medium">Fail / Problem</div>
                  <div className="text-gray-400">Mark item with issue</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔁</span>
                <div>
                  <div className="font-medium">Repeat</div>
                  <div className="text-gray-400">Read the item again</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏭️</span>
                <div>
                  <div className="font-medium">Skip</div>
                  <div className="text-gray-400">Move to next item</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <div className="font-medium">Note: [text]</div>
                  <div className="text-gray-400">Add a note</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceInspectionMode







