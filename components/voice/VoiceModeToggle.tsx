'use client'

import React, { useState, useEffect } from 'react'

interface VoiceModeToggleProps {
  mode: 'manual' | 'voice'
  onModeChange: (mode: 'manual' | 'voice') => void
  disabled?: boolean
  className?: string
}

export function VoiceModeToggle({ 
  mode, 
  onModeChange, 
  disabled = false,
  className = '' 
}: VoiceModeToggleProps) {
  const [isSupported, setIsSupported] = useState(true)

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window
    
    setIsSupported(!!SpeechRecognition && hasTTS)
  }, [])

  if (!isSupported) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        Voice mode not supported
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => onModeChange(mode === 'manual' ? 'voice' : 'manual')}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm
          transition-all duration-200
          ${mode === 'voice' 
            ? 'bg-green-600 text-white shadow-lg shadow-green-600/30' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className="text-lg">{mode === 'voice' ? '🎤' : '☑️'}</span>
        <span>{mode === 'voice' ? 'Voice Mode' : 'Manual Mode'}</span>
      </button>
    </div>
  )
}

/**
 * Floating voice mode button for bottom of screen
 */
export function VoiceModeFloatingButton({
  mode,
  onModeChange,
  disabled = false,
}: {
  mode: 'manual' | 'voice'
  onModeChange: (mode: 'manual' | 'voice') => void
  disabled?: boolean
}) {
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window
    setIsSupported(!!SpeechRecognition && hasTTS)
  }, [])

  if (!isSupported) return null

  return (
    <button
      onClick={() => onModeChange(mode === 'manual' ? 'voice' : 'manual')}
      disabled={disabled}
      className={`
        fixed bottom-24 left-4 z-40
        w-14 h-14 rounded-full shadow-lg
        flex items-center justify-center
        transition-all duration-200
        ${mode === 'voice'
          ? 'bg-green-600 text-white shadow-green-600/40'
          : 'bg-white text-gray-700 shadow-gray-300'
        }
        ${disabled ? 'opacity-50' : 'hover:scale-105 active:scale-95'}
      `}
      title={mode === 'voice' ? 'Switch to Manual' : 'Switch to Voice Mode'}
    >
      <span className="text-2xl">{mode === 'voice' ? '🎤' : '🎙️'}</span>
    </button>
  )
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export default VoiceModeToggle




