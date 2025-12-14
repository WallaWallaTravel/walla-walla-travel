'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseTTSOptions {
  rate?: number // 0.1 to 10, default 1
  pitch?: number // 0 to 2, default 1
  volume?: number // 0 to 1, default 1
  voice?: string // Voice name preference
  lang?: string // Language code
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

interface TTSState {
  isSupported: boolean
  isSpeaking: boolean
  isPaused: boolean
  voices: SpeechSynthesisVoice[]
  currentVoice: SpeechSynthesisVoice | null
  error: string | null
}

export function useTTS(options: UseTTSOptions = {}) {
  const {
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    voice: preferredVoice,
    lang = 'en-US',
    onStart,
    onEnd,
    onError,
  } = options

  const [state, setState] = useState<TTSState>({
    isSupported: false,
    isSpeaking: false,
    isPaused: false,
    voices: [],
    currentVoice: null,
    error: null,
  })

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const queueRef = useRef<string[]>([])
  const isProcessingRef = useRef(false)

  // Check support and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setState(prev => ({ 
        ...prev, 
        isSupported: false,
        error: 'Text-to-speech not supported'
      }))
      return
    }

    setState(prev => ({ ...prev, isSupported: true }))

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices()
      
      if (availableVoices.length > 0) {
        // Find the best voice
        let selectedVoice = availableVoices.find(v => 
          v.name.toLowerCase().includes(preferredVoice?.toLowerCase() || '') &&
          v.lang.startsWith(lang.split('-')[0])
        )

        // Fallback to any English voice
        if (!selectedVoice) {
          selectedVoice = availableVoices.find(v => 
            v.lang.startsWith('en') && v.localService
          ) || availableVoices.find(v => v.lang.startsWith('en'))
        }

        // Final fallback
        if (!selectedVoice && availableVoices.length > 0) {
          selectedVoice = availableVoices[0]
        }

        setState(prev => ({
          ...prev,
          voices: availableVoices,
          currentVoice: selectedVoice || null,
        }))
      }
    }

    // Load voices (may be async)
    loadVoices()
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = null
      }
    }
  }, [preferredVoice, lang])

  // Process queue
  const processQueue = useCallback(() => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return
    }

    const text = queueRef.current.shift()
    if (!text) return

    isProcessingRef.current = true

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = volume
    utterance.lang = lang

    if (state.currentVoice) {
      utterance.voice = state.currentVoice
    }

    utterance.onstart = () => {
      setState(prev => ({ ...prev, isSpeaking: true, error: null }))
      onStart?.()
    }

    utterance.onend = () => {
      isProcessingRef.current = false
      setState(prev => ({ ...prev, isSpeaking: false }))
      onEnd?.()
      // Process next in queue
      processQueue()
    }

    utterance.onerror = (event) => {
      console.error('[TTS] Error:', event.error)
      isProcessingRef.current = false
      setState(prev => ({ 
        ...prev, 
        isSpeaking: false, 
        error: `Speech error: ${event.error}` 
      }))
      onError?.(event.error)
      // Try next in queue
      processQueue()
    }

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [rate, pitch, volume, lang, state.currentVoice, onStart, onEnd, onError])

  // Speak text
  const speak = useCallback((text: string) => {
    if (!state.isSupported) {
      const error = 'Text-to-speech not supported'
      setState(prev => ({ ...prev, error }))
      onError?.(error)
      return
    }

    // Cancel any current speech
    speechSynthesis.cancel()
    
    // Clear queue and add new text
    queueRef.current = [text]
    isProcessingRef.current = false
    
    // Start processing
    processQueue()
  }, [state.isSupported, processQueue, onError])

  // Queue text (adds to end)
  const queue = useCallback((text: string) => {
    if (!state.isSupported) return
    
    queueRef.current.push(text)
    
    if (!state.isSpeaking && !isProcessingRef.current) {
      processQueue()
    }
  }, [state.isSupported, state.isSpeaking, processQueue])

  // Speak items in sequence
  const speakSequence = useCallback((items: string[], delay: number = 300) => {
    if (!state.isSupported) return

    speechSynthesis.cancel()
    queueRef.current = [...items]
    isProcessingRef.current = false
    processQueue()
  }, [state.isSupported, processQueue])

  // Stop speaking
  const stop = useCallback(() => {
    speechSynthesis.cancel()
    queueRef.current = []
    isProcessingRef.current = false
    setState(prev => ({ ...prev, isSpeaking: false, isPaused: false }))
  }, [])

  // Pause speaking
  const pause = useCallback(() => {
    speechSynthesis.pause()
    setState(prev => ({ ...prev, isPaused: true }))
  }, [])

  // Resume speaking
  const resume = useCallback(() => {
    speechSynthesis.resume()
    setState(prev => ({ ...prev, isPaused: false }))
  }, [])

  // Set voice by name
  const setVoice = useCallback((voiceName: string) => {
    const newVoice = state.voices.find(v => 
      v.name.toLowerCase().includes(voiceName.toLowerCase())
    )
    if (newVoice) {
      setState(prev => ({ ...prev, currentVoice: newVoice }))
    }
  }, [state.voices])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel()
      queueRef.current = []
    }
  }, [])

  return {
    ...state,
    speak,
    queue,
    speakSequence,
    stop,
    pause,
    resume,
    setVoice,
  }
}

/**
 * Format inspection item for TTS
 * Makes technical terms more pronounceable
 */
export function formatForTTS(text: string): string {
  return text
    // Expand common abbreviations
    .replace(/\bLT\b/gi, 'left')
    .replace(/\bRT\b/gi, 'right')
    .replace(/\bFR\b/gi, 'front')
    .replace(/\bRR\b/gi, 'rear')
    .replace(/\bPSI\b/gi, 'P S I')
    // Clean up punctuation
    .replace(/\s*-\s*/g, ', ')
    .replace(/\s*\/\s*/g, ' or ')
    // Add pauses
    .replace(/\.\s*/g, '. ')
    .replace(/,\s*/g, ', ')
}




