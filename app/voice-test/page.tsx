'use client'

import React, { useState, useMemo } from 'react'
import { VoiceInspectionMode, VoiceModeToggle } from '@/components/voice'

const sampleItems = [
  { id: 'ext-0', category: 'Exterior', text: 'Tires - Check pressure and tread', checked: false },
  { id: 'ext-1', category: 'Exterior', text: 'Lights - All working (headlights, brake, turn signals)', checked: false },
  { id: 'ext-2', category: 'Exterior', text: 'Mirrors - Clean and properly adjusted', checked: false },
  { id: 'int-0', category: 'Interior', text: 'Seatbelts - All functioning properly', checked: false },
  { id: 'int-1', category: 'Interior', text: 'Dashboard warning lights - None illuminated', checked: false },
  { id: 'mech-0', category: 'Mechanical', text: 'Brakes - Test for proper function', checked: false },
  { id: 'mech-1', category: 'Mechanical', text: 'Steering - No excessive play', checked: false },
]

export default function VoiceTestPage() {
  const [mode, setMode] = useState<'manual' | 'voice'>('manual')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [completed, setCompleted] = useState(false)

  const items = useMemo(() => 
    sampleItems.map(item => ({
      ...item,
      checked: checkedItems[item.id] || false,
    })),
    [checkedItems]
  )

  const handleItemCheck = (id: string, checked: boolean, note?: string) => {
    console.log(`Item ${id} ${checked ? 'passed' : 'failed'}${note ? `: ${note}` : ''}`)
    setCheckedItems(prev => ({ ...prev, [id]: checked }))
  }

  const handleComplete = () => {
    setCompleted(true)
    setMode('manual')
  }

  const handleCancel = () => {
    setMode('manual')
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Voice Test Complete!</h1>
          <p className="text-gray-600 mb-6">
            {Object.values(checkedItems).filter(Boolean).length} of {sampleItems.length} items checked
          </p>
          <button
            onClick={() => {
              setCompleted(false)
              setCheckedItems({})
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'voice') {
    return (
      <VoiceInspectionMode
        items={items}
        onItemCheck={handleItemCheck}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onModeChange={setMode}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🎤 Voice Inspection Test</h1>
          <p className="text-gray-600 mb-6">
            Test the voice-driven inspection interface. Click the button below to start voice mode,
            then use voice commands like "Pass", "Fail", "Repeat", or "Skip".
          </p>
          
          <div className="flex items-center gap-4 mb-6">
            <VoiceModeToggle 
              mode={mode} 
              onModeChange={setMode}
            />
            <span className="text-sm text-gray-500">
              {Object.values(checkedItems).filter(Boolean).length} / {sampleItems.length} checked
            </span>
          </div>

          <button
            onClick={() => setMode('voice')}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors"
          >
            <span className="text-2xl">🎤</span>
            <span>Start Voice Inspection</span>
          </button>
        </div>

        {/* Manual mode items */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Mode</h2>
          <div className="space-y-3">
            {items.map(item => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={e => handleItemCheck(item.id, e.target.checked)}
                  className="w-6 h-6 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {item.category}
                  </span>
                  <div className="text-gray-900">{item.text}</div>
                </div>
              </label>
            ))}
          </div>
          
          <button
            onClick={handleComplete}
            disabled={Object.values(checkedItems).filter(Boolean).length !== sampleItems.length}
            className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            Complete Inspection
          </button>
        </div>

        {/* Browser support notice */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <strong>Note:</strong> Voice recognition works best in Chrome or Edge. Safari has limited support.
          Make sure to allow microphone access when prompted.
        </div>
      </div>
    </div>
  )
}







