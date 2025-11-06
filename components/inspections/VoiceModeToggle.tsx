'use client'

import React from 'react'

interface VoiceModeToggleProps {
  mode: 'checkbox' | 'voice'
  onModeChange: (mode: 'checkbox' | 'voice') => void
  disabled?: boolean
}

export function VoiceModeToggle({ mode, onModeChange, disabled = false }: VoiceModeToggleProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onModeChange('checkbox')}
          disabled={disabled}
          className={`
            py-3 px-4 rounded-lg font-medium transition-all
            ${
              mode === 'checkbox'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">✓</span>
            <span className="text-sm">Checkbox</span>
          </div>
        </button>

        <button
          onClick={() => onModeChange('voice')}
          disabled={disabled}
          className={`
            py-3 px-4 rounded-lg font-medium transition-all
            ${
              mode === 'voice'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">🎤</span>
            <span className="text-sm">Voice</span>
          </div>
        </button>
      </div>

      {/* Info text */}
      <div className="mt-3 px-2">
        <p className="text-xs text-gray-600 text-center">
          {mode === 'checkbox' 
            ? 'Tap checkboxes to complete inspection'
            : 'Speak your answers hands-free'
          }
        </p>
      </div>
    </div>
  )
}

