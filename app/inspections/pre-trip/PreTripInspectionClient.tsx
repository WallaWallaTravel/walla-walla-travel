'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api-client'
import { sanitizeText, sanitizeNumber, patterns } from '@/lib/security'
import {
  TouchButton,
  BottomActionBar,
  BottomActionBarSpacer,
  SignatureCanvas,
  MobileCard,
  AlertBanner,
  MobileCheckbox,
  MobileInput,
  haptics
} from '@/components/mobile'
import { VoiceInspectionMode, VoiceModeFloatingButton } from '@/components/voice'
import type { AssignedVehicle } from '@/lib/types'

interface Props {
  driver: {
    id: string
    name: string
    email: string
  }
}

export function PreTripInspectionClient({ driver }: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<'mileage' | 'inspection' | 'signature'>('mileage')
  const [beginningMileage, setBeginningMileage] = useState('')
  const [notes, setNotes] = useState('')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vehicle, setVehicle] = useState<AssignedVehicle | null>(null)
  const [loadingVehicle, setLoadingVehicle] = useState(true)
  const [sendingHelp, setSendingHelp] = useState(false)
  const [helpSent, setHelpSent] = useState(false)
  const [inspectionMode, setInspectionMode] = useState<'manual' | 'voice'>('manual')

  useEffect(() => {
    loadAssignedVehicle()
  }, [])

  async function loadAssignedVehicle() {
    try {
      const result = await api.vehicle.getAssignedVehicle()
      if (result.success && result.data) {
        setVehicle(result.data)
      } else {
        setError('No vehicle assigned. Please contact your supervisor.')
      }
    } catch (_err) {
      setError('Failed to load vehicle information')
    } finally {
      setLoadingVehicle(false)
    }
  }

  async function handleRequestHelp() {
    setSendingHelp(true)
    try {
      const response = await fetch('/api/emergency/supervisor-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason: 'No vehicle assigned for pre-trip inspection',
          timeCardId: null
        })
      })

      const data = await response.json()

      if (data.success) {
        setHelpSent(true)
        setError(null)
        haptics.success()
        setTimeout(() => {
          router.push('/workflow')
        }, 3000)
      } else {
        setError('Failed to send help request. Please call supervisor directly.')
        haptics.error()
      }
    } catch (_err) {
      setError('Unable to send help request. Please call supervisor.')
      haptics.error()
    } finally {
      setSendingHelp(false)
    }
  }

  const inspectionItems = {
    exterior: [
      'Tires - Check pressure and tread',
      'Lights - All working (headlights, brake, turn signals)',
      'Mirrors - Clean and properly adjusted',
      'Body damage - Note any new damage',
      'License plates - Present and clean',
      'Windows - Clean and unobstructed'
    ],
    interior: [
      'Seatbelts - All functioning properly',
      'Dashboard warning lights - None illuminated',
      'Fuel level - Adequate for route',
      'Emergency equipment - Present and accessible',
      'Cleanliness - Interior clean and organized',
      'Documentation - Registration and insurance present'
    ],
    mechanical: [
      'Brakes - Test for proper function',
      'Steering - No excessive play',
      'Horn - Working properly',
      'Windshield wipers - Functioning',
      'Fluids - Check oil, coolant, washer fluid',
      'Engine - No unusual noises or warning lights'
    ]
  }

  const handleItemToggle = (category: string, index: number) => {
    const key = `${category}-${index}`
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Format items for voice mode
  const voiceItems = useMemo(() => {
    const items: { id: string; category: string; text: string; checked: boolean }[] = []
    Object.entries(inspectionItems).forEach(([category, categoryItems]) => {
      categoryItems.forEach((item, index) => {
        const key = `${category}-${index}`
        items.push({
          id: key,
          category: category.charAt(0).toUpperCase() + category.slice(1),
          text: item,
          checked: checkedItems[key] || false,
        })
      })
    })
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedItems])

  // Handle voice mode item check
  const handleVoiceItemCheck = (id: string, checked: boolean, note?: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: checked }))
    if (note) {
      setItemNotes(prev => ({ ...prev, [id]: note }))
    }
  }

  // Handle voice mode complete
  const handleVoiceComplete = () => {
    setInspectionMode('manual')
    setCurrentStep('signature')
    haptics.success()
  }

  // Handle voice mode cancel
  const handleVoiceCancel = () => {
    setInspectionMode('manual')
  }

  const handleMileageNext = () => {
    if (!patterns.mileage.test(beginningMileage)) {
      setError('Invalid mileage format')
      haptics.error()
      return
    }
    
    const mileage = sanitizeNumber(beginningMileage)
    if (!mileage || mileage < 0 || mileage > 9999999) {
      setError('Mileage must be between 0 and 9,999,999')
      haptics.error()
      return
    }

    haptics.success()
    setError(null)
    setCurrentStep('inspection')
  }

  const handleInspectionNext = () => {
    const totalItems = Object.values(inspectionItems).reduce((acc, items) => acc + items.length, 0)
    const checkedCount = Object.values(checkedItems).filter(Boolean).length
    
    if (checkedCount !== totalItems) {
      setError(`Please complete all inspection items (${checkedCount}/${totalItems} checked)`)
      haptics.error()
      return
    }

    haptics.success()
    setError(null)
    setCurrentStep('signature')
  }

  const handleSignatureClear = () => {
    setSignature(null)
    haptics.light()
  }

  const handleSubmit = async () => {
    if (!signature) {
      setError('Please sign the inspection form')
      haptics.error()
      return
    }

    if (!vehicle) {
      setError('No vehicle assigned')
      haptics.error()
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const mileage = sanitizeNumber(beginningMileage)
      const sanitizedNotes = sanitizeText(notes)

      // Save inspection using API
      const result = await api.inspection.submitPreTrip({
        vehicleId: vehicle.id,
        startMileage: mileage || 0,
        inspectionData: {
          items: checkedItems,
          notes: sanitizedNotes || '',
          signature: signature
        }
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save inspection')
      }

      haptics.success()
      // Redirect back to workflow
      router.push('/workflow')
      
    } catch (error) {
      console.error('Submission error:', error)
      setError(error instanceof Error ? error.message : 'Error saving inspection')
      haptics.error()
      setSubmitting(false)
    }
  }

  const totalItems = Object.values(inspectionItems).reduce((acc, items) => acc + items.length, 0)
  const checkedCount = Object.values(checkedItems).filter(Boolean).length
  const allItemsChecked = checkedCount === totalItems

  if (loadingVehicle) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-800">Loading vehicle information...</p>
        </div>
      </div>
    )
  }

  // Show emergency help screen if no vehicle assigned
  if (!vehicle && !loadingVehicle) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Vehicle Assigned</h1>
            <p className="text-gray-800">
              You need a vehicle assignment to complete the pre-trip inspection.
            </p>
          </div>

          {helpSent ? (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-green-800 mb-2">Help Request Sent!</h2>
              <p className="text-green-700 mb-4">
                Your supervisor has been notified and will assign you a vehicle soon.
              </p>
              <p className="text-sm text-green-600">
                Returning to dashboard in 3 seconds...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <button
                  onClick={handleRequestHelp}
                  disabled={sendingHelp}
                  className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-lg text-lg flex items-center justify-center gap-3 transition-colors"
                >
                  {sendingHelp ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <span>🆘</span>
                      <span>Request Supervisor Help</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.push('/workflow')}
                  className="w-full py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="text-blue-800 font-medium mb-2">What happens when you request help?</p>
                <ul className="text-blue-700 space-y-1 list-disc list-inside">
                  <li>Supervisor receives SMS notification</li>
                  <li>Supervisor receives email with details</li>
                  <li>You'll be assigned a vehicle promptly</li>
                  <li>You can return and complete inspection</li>
                </ul>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">{error}</p>
                  <p className="text-red-600 text-sm mt-1">
                    Emergency Contact: info@nwtouring.com
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Voice mode overlay
  if (inspectionMode === 'voice' && currentStep === 'inspection') {
    return (
      <VoiceInspectionMode
        items={voiceItems}
        onItemCheck={handleVoiceItemCheck}
        onComplete={handleVoiceComplete}
        onCancel={handleVoiceCancel}
        onModeChange={setInspectionMode}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Voice mode floating button (only during inspection step) */}
      {currentStep === 'inspection' && (
        <VoiceModeFloatingButton
          mode={inspectionMode}
          onModeChange={setInspectionMode}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pre-Trip Inspection</h1>
            <p className="text-sm text-gray-800">Driver: {driver.name}</p>
          </div>
          {currentStep === 'inspection' && (
            <button
              onClick={() => setInspectionMode('voice')}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium"
            >
              <span>🎤</span>
              <span>Voice</span>
            </button>
          )}
        </div>
        {vehicle && (
          <p className="text-sm text-gray-800">Vehicle: {vehicle.vehicle_number} ({vehicle.make} {vehicle.model})</p>
        )}
        <p className="text-sm text-gray-800">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-between px-4 py-3 bg-white border-b">
        <div className={`flex-1 text-center py-2 ${currentStep === 'mileage' ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'mileage' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'
          }`}>1</div>
          <span className="text-xs">Mileage</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'inspection' ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'inspection' ? 'bg-blue-600 text-white' : 
            checkedCount === totalItems ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>2</div>
          <span className="text-xs">Inspection</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'signature' ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'signature' ? 'bg-blue-600 text-white' :
            signature ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>3</div>
          <span className="text-xs">Signature</span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <AlertBanner
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Step content */}
      <div className="p-4">
        {/* Step 1: Mileage */}
        {currentStep === 'mileage' && (
          <MobileCard>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Enter Beginning Mileage</h2>
            <MobileInput
              label="Vehicle Mileage"
              type="text"
              inputMode="numeric"
              pattern="\d{1,7}"
              value={beginningMileage}
              onChange={(e) => setBeginningMileage(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter current mileage"
              maxLength={7}
              hint="Enter the current odometer reading"
            />
          </MobileCard>
        )}

        {/* Step 2: Inspection */}
        {currentStep === 'inspection' && (
          <>
            {Object.entries(inspectionItems).map(([category, items]) => (
              <MobileCard key={category} className="mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-3 capitalize">
                  {category.replace('_', ' ')} Inspection
                </h2>
                <div className="space-y-1">
                  {items.map((item, index) => (
                    <MobileCheckbox
                      key={index}
                      label={item}
                      checked={checkedItems[`${category}-${index}`] || false}
                      onChange={() => handleItemToggle(category, index)}
                    />
                  ))}
                </div>
              </MobileCard>
            ))}

            <MobileCard>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 min-h-[100px] text-base text-gray-900 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-80 placeholder:text-gray-600"
                rows={4}
                maxLength={500}
                placeholder="Note any issues or concerns..."
                style={{ fontSize: '16px' }}
              />
              <p className="text-sm text-gray-700 mt-2">
                {notes.length}/500 characters
              </p>
            </MobileCard>
            
            <div className="mt-4 text-center text-sm text-gray-800">
              <p className="font-medium">{checkedCount} of {totalItems} items checked</p>
              {checkedCount === totalItems && (
                <p className="text-green-600 mt-1">✓ All items inspected</p>
              )}
            </div>
          </>
        )}

        {/* Step 3: Signature */}
        {currentStep === 'signature' && (
          <MobileCard>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Driver Signature</h2>
            <p className="text-sm text-gray-800 mb-4">
              By signing below, you confirm that you have completed the pre-trip inspection
              and the vehicle is safe to operate.
            </p>
            
            <SignatureCanvas
              onSave={setSignature}
              onClear={handleSignatureClear}
            />
            
            {signature && (
              <p className="text-sm text-green-600 mt-2">✓ Signature captured</p>
            )}
          </MobileCard>
        )}
      </div>

      {/* Bottom action bar with spacer */}
      <BottomActionBarSpacer />
      
      <BottomActionBar>
        <div className="flex gap-3">
          {/* Back button */}
          {currentStep !== 'mileage' && (
            <TouchButton
              variant="secondary"
              onClick={() => {
                haptics.light()
                if (currentStep === 'inspection') setCurrentStep('mileage')
                if (currentStep === 'signature') setCurrentStep('inspection')
              }}
              className="flex-1"
            >
              Back
            </TouchButton>
          )}
          
          {/* Cancel button (only on first step) */}
          {currentStep === 'mileage' && (
            <TouchButton
              variant="secondary"
              onClick={() => {
                haptics.light()
                router.push('/workflow')
              }}
              className="flex-1"
            >
              Cancel
            </TouchButton>
          )}
          
          {/* Next/Submit button */}
          {currentStep === 'mileage' && (
            <TouchButton
              variant="primary"
              onClick={handleMileageNext}
              disabled={!beginningMileage}
              className="flex-1"
            >
              Next
            </TouchButton>
          )}
          
          {currentStep === 'inspection' && (
            <TouchButton
              variant="primary"
              onClick={handleInspectionNext}
              disabled={checkedCount !== totalItems}
              className="flex-1"
            >
              Next ({checkedCount}/{totalItems})
            </TouchButton>
          )}
          
          {currentStep === 'signature' && (
            <TouchButton
              variant="primary"
              onClick={handleSubmit}
              disabled={!signature || submitting}
              loading={submitting}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Complete Inspection'}
            </TouchButton>
          )}
        </div>
      </BottomActionBar>
    </div>
  )
}

// Default export for backward compatibility
export default PreTripInspectionClient
