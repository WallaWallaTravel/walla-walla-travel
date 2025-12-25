'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { parseCommand, InspectionCommand } from './command-parser'

interface UseVoiceRecognitionOptions {
  continuous?: boolean
  language?: string
  interimResults?: boolean
  onResult?: (command: InspectionCommand, transcript: string) => void
  onError?: (error: string) => void
  onListening?: (isListening: boolean) => void
}

interface VoiceRecognitionState {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  lastCommand: InspectionCommand | null
  confidence: number
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const {
    continuous = true,
    language = 'en-US',
    interimResults = true,
    onResult,
    onError,
    onListening,
  } = options

  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    lastCommand: null,
    confidence: 0,
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setState(prev => ({ ...prev, isSupported: true }))
    } else {
      setState(prev => ({ 
        ...prev, 
        isSupported: false,
        error: 'Voice recognition not supported in this browser'
      }))
    }
  }, [])

  // Initialize recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) return null

    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = language
    recognition.maxAlternatives = 3

    recognition.onstart = () => {
      console.log('[Voice] Recognition started')
      setState(prev => ({ ...prev, isListening: true, error: null }))
      onListening?.(true)
    }

    recognition.onend = () => {
      console.log('[Voice] Recognition ended')
      setState(prev => ({ ...prev, isListening: false }))
      onListening?.(false)

      // Auto-restart if still supposed to be listening
      if (recognitionRef.current && continuous) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognitionRef.current?.start()
          } catch (e) {
            console.log('[Voice] Could not restart:', e)
          }
        }, 100)
      }
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''
      let bestConfidence = 0

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        const confidence = result[0].confidence

        if (result.isFinal) {
          finalTranscript += transcript
          bestConfidence = Math.max(bestConfidence, confidence)
        } else {
          interimTranscript += transcript
        }
      }

      if (interimTranscript) {
        setState(prev => ({ ...prev, interimTranscript }))
      }

      if (finalTranscript) {
        console.log('[Voice] Final transcript:', finalTranscript, 'Confidence:', bestConfidence)
        
        const command = parseCommand(finalTranscript, bestConfidence)
        
        setState(prev => ({
          ...prev,
          transcript: finalTranscript,
          interimTranscript: '',
          lastCommand: command,
          confidence: bestConfidence,
        }))

        onResult?.(command, finalTranscript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[Voice] Recognition error:', event.error)
      
      let errorMessage = 'Voice recognition error'
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your device.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.'
          break
        case 'network':
          errorMessage = 'Network error. Voice may not work offline with Web Speech API.'
          break
        case 'aborted':
          // User or system aborted - don't show error
          return
        default:
          errorMessage = `Voice error: ${event.error}`
      }

      setState(prev => ({ ...prev, error: errorMessage, isListening: false }))
      onError?.(errorMessage)
    }

    return recognition
  }, [continuous, interimResults, language, onResult, onError, onListening])

  // Start listening
  const startListening = useCallback(() => {
    if (!state.isSupported) {
      const error = 'Voice recognition not supported'
      setState(prev => ({ ...prev, error }))
      onError?.(error)
      return
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore
      }
    }

    // Clear any restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }

    // Initialize and start
    recognitionRef.current = initRecognition()
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
        console.log('[Voice] Starting recognition...')
      } catch (error) {
        console.error('[Voice] Failed to start:', error)
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to start voice recognition',
          isListening: false 
        }))
      }
    }
  }, [state.isSupported, initRecognition, onError])

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('[Voice] Stopping recognition...')
    
    // Clear restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore
      }
      recognitionRef.current = null
    }

    setState(prev => ({ 
      ...prev, 
      isListening: false,
      interimTranscript: '' 
    }))
  }, [])

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      lastCommand: null,
      confidence: 0,
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [])

  return {
    ...state,
    startListening,
    stopListening,
    clearTranscript,
  }
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}







