'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface TextToSpeechOptions {
  lang?: string
  rate?: number  // 0.1 to 10, default 1
  pitch?: number // 0 to 2, default 1
  volume?: number // 0 to 1, default 1
  voice?: string // Voice name (optional)
  onEnd?: () => void
  onError?: (error: Error) => void
}

export interface TextToSpeechReturn {
  speak: (text: string) => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  isSpeaking: boolean
  isPaused: boolean
  isSupported: boolean
  voices: SpeechSynthesisVoice[]
  setVoice: (voiceName: string) => void
  setRate: (rate: number) => void
  setPitch: (pitch: number) => void
  setVolume: (volume: number) => void
}

export function useTextToSpeech(options: TextToSpeechOptions = {}): TextToSpeechReturn {
  const {
    lang = 'en-US',
    rate: initialRate = 1,
    pitch: initialPitch = 1,
    volume: initialVolume = 1,
    voice: initialVoiceName,
    onEnd,
    onError,
  } = options

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)

  const [rate, setRateState] = useState(initialRate)
  const [pitch, setPitchState] = useState(initialPitch)
  const [volume, setVolumeState] = useState(initialVolume)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Check browser support and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setIsSupported(true)

      // Load available voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices()
        setVoices(availableVoices)

        // Select initial voice
        if (initialVoiceName) {
          const voice = availableVoices.find((v) => v.name === initialVoiceName)
          if (voice) setSelectedVoice(voice)
        } else {
          // Default to first voice matching language
          const voice = availableVoices.find((v) => v.lang.startsWith(lang.split('-')[0]))
          if (voice) setSelectedVoice(voice)
        }
      }

      // Voices might load asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices
      }

      loadVoices()
    }
  }, [lang, initialVoiceName])

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!isSupported) {
        throw new Error('Text-to-speech not supported in this browser')
      }

      // Stop any ongoing speech
      window.speechSynthesis.cancel()

      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = lang
        utterance.rate = rate
        utterance.pitch = pitch
        utterance.volume = volume

        if (selectedVoice) {
          utterance.voice = selectedVoice
        }

        utterance.onstart = () => {
          console.log('TTS started')
          setIsSpeaking(true)
          setIsPaused(false)
        }

        utterance.onend = () => {
          console.log('TTS ended')
          setIsSpeaking(false)
          setIsPaused(false)
          if (onEnd) onEnd()
          resolve()
        }

        utterance.onerror = (event) => {
          console.error('TTS error:', event)
          setIsSpeaking(false)
          setIsPaused(false)
          const error = new Error(`Speech synthesis error: ${event.error}`)
          if (onError) onError(error)
          reject(error)
        }

        utterance.onpause = () => {
          setIsPaused(true)
        }

        utterance.onresume = () => {
          setIsPaused(false)
        }

        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      })
    },
    [isSupported, lang, rate, pitch, volume, selectedVoice, onEnd, onError]
  )

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [])

  const pause = useCallback(() => {
    if (window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }, [isSpeaking])

  const resume = useCallback(() => {
    if (window.speechSynthesis && isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }, [isPaused])

  const setVoice = useCallback(
    (voiceName: string) => {
      const voice = voices.find((v) => v.name === voiceName)
      if (voice) {
        setSelectedVoice(voice)
      }
    },
    [voices]
  )

  const setRate = useCallback((newRate: number) => {
    setRateState(Math.max(0.1, Math.min(10, newRate)))
  }, [])

  const setPitch = useCallback((newPitch: number) => {
    setPitchState(Math.max(0, Math.min(2, newPitch)))
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    setVoice,
    setRate,
    setPitch,
    setVolume,
  }
}

