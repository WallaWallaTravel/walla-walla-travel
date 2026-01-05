'use client'

import { useState, useRef, useCallback } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
  error: string | null
}

export interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  clearRecording: () => void
}

/**
 * Custom hook for recording audio
 * Compatible with iOS Safari, Chrome, Firefox, Edge
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setAudioBlob(null)
      chunksRef.current = []

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      })

      // Determine best MIME type for browser
      let mimeType = 'audio/webm;codecs=opus' // Best quality, works in Chrome/Firefox
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // iOS Safari fallback
        mimeType = 'audio/mp4'
      }

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Last resort
        mimeType = 'audio/webm'
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event)
        setError('Recording failed. Please try again.')
        setIsRecording(false)
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      startTimeRef.current = Date.now()

      // Update duration every 100ms
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
      }, 100)

    } catch (err: unknown) {
      console.error('Error accessing microphone:', err)

      const errorName = err instanceof Error && 'name' in err ? (err as { name: string }).name : ''
      if (errorName === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.')
      } else if (errorName === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.')
      } else {
        setError('Could not access microphone. Please check your settings.')
      }
      
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
    }
  }, [isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording, isPaused])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      
      // Resume timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
      }, 100)
    }
  }, [isRecording, isPaused])

  const clearRecording = useCallback(() => {
    setAudioBlob(null)
    setDuration(0)
    setError(null)
    chunksRef.current = []
  }, [])

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording
  }
}

