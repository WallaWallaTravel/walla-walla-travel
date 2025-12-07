'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Types for Web Speech API - use any to avoid conflicts with built-in types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any

interface VoiceRecognitionOptions {
  continuous?: boolean
  interimResults?: boolean
  lang?: string
  onTranscript?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

export interface VoiceRecognitionReturn {
  isListening: boolean
  transcript: string
  interimTranscript: string
  confidence: number
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  isSupported: boolean
  error: string | null
}

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}): VoiceRecognitionReturn {
  const {
    continuous = false,
    interimResults = true,
    lang = 'en-US',
    onTranscript,
    onError,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionType>(null)

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use window properties for cross-browser compatibility
      const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setIsSupported(!!SpeechRecognitionCtor)

      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor()
        recognition.continuous = continuous
        recognition.interimResults = interimResults
        recognition.lang = lang

        recognitionRef.current = recognition
      }
    }
  }, [continuous, interimResults, lang])

  // Set up event handlers
  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    recognition.onresult = (event: any) => {
      let interimText = ''
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript

        if (result.isFinal) {
          finalText += text + ' '
          setConfidence(result[0].confidence)
          
          if (onTranscript) {
            onTranscript(text, true)
          }
        } else {
          interimText += text
        }
      }

      if (finalText) {
        setTranscript((prev) => prev + finalText)
      }

      setInterimTranscript(interimText)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error, event.message)
      const errorMessage = getErrorMessage(event.error)
      setError(errorMessage)
      setIsListening(false)

      if (onError) {
        onError(errorMessage)
      }
    }

    recognition.onend = () => {
      console.log('Speech recognition ended')
      setIsListening(false)
      setInterimTranscript('')
    }

    recognition.onstart = () => {
      console.log('Speech recognition started')
      setIsListening(true)
      setError(null)
    }

    return () => {
      if (isListening) {
        recognition.stop()
      }
    }
  }, [isListening, onTranscript, onError])

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) {
      setError('Speech recognition not supported')
      return
    }

    if (isListening) {
      console.warn('Already listening')
      return
    }

    try {
      recognition.start()
    } catch (err) {
      console.error('Failed to start recognition:', err)
      setError('Failed to start voice recognition')
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (!isListening) {
      console.warn('Not currently listening')
      return
    }

    try {
      recognition.stop()
    } catch (err) {
      console.error('Failed to stop recognition:', err)
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setConfidence(0)
    setError(null)
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    confidence,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  }
}

// Helper to get user-friendly error messages
function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No speech detected. Please try again.'
    case 'audio-capture':
      return 'No microphone found. Please connect a microphone.'
    case 'not-allowed':
      return 'Microphone access denied. Please grant permission.'
    case 'network':
      return 'Network error. Please check your connection.'
    case 'aborted':
      return 'Speech recognition aborted.'
    case 'bad-grammar':
      return 'Grammar error in recognition.'
    case 'language-not-supported':
      return 'Language not supported.'
    default:
      return `Speech recognition error: ${error}`
  }
}

