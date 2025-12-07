'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TouchButton,
  BottomActionBar,
  BottomActionBarSpacer,
  SignatureCanvas,
  MobileCard,
  AlertBanner,
  MobileCheckbox,
  MobileInput,
} from '@/components/mobile'

/**
 * QUICK INSPECTION PAGE
 * Emergency bypass for immediate inspection needs
 * Saves directly to database for Vehicle #2
 */
export default function QuickInspectionPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<'mileage' | 'inspection' | 'signature'>('mileage')
  const [beginningMileage, setBeginningMileage] = useState('')
  const [notes, setNotes] = useState('')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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

  const totalItems = Object.values(inspectionItems).reduce((acc, items) => acc + items.length, 0)
  const checkedCount = Object.values(checkedItems).filter(Boolean).length

  const handleSubmit = async () => {
    if (!signature) {
      setError('Please sign the inspection form')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Save inspection to database
      const response = await fetch('/api/inspections/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vehicleId: 2, // Vehicle #2 as specified
          startMileage: parseInt(beginningMileage) || 0,
          type: 'pre_trip',
          inspectionData: {
            items: checkedItems,
            notes: notes,
            signature: signature
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/driver-portal/dashboard')
        }, 2000)
      } else {
        setError(data.error || 'Failed to save inspection')
      }
    } catch (err) {
      console.error('Submit error:', err)
      setError('Network error - inspection saved locally')
      // Save to localStorage as backup
      const backup = {
        timestamp: new Date().toISOString(),
        vehicleId: 2,
        mileage: beginningMileage,
        checklist: checkedItems,
        notes,
        signature: signature ? 'captured' : null
      }
      localStorage.setItem('inspection_backup_' + Date.now(), JSON.stringify(backup))
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Inspection Complete!</h1>
          <p className="text-green-600 mb-4">Pre-trip inspection saved successfully.</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-900 text-white px-4 py-3">
        <h1 className="text-xl font-semibold">Quick Pre-Trip Inspection</h1>
        <p className="text-sm opacity-90">Vehicle #2 • Ryan Madsen</p>
        <p className="text-sm opacity-90">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-between px-4 py-3 bg-white border-b">
        <div className={`flex-1 text-center py-2 ${currentStep === 'mileage' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'mileage' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'
          }`}>1</div>
          <span className="text-xs">Mileage</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'inspection' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'inspection' ? 'bg-blue-600 text-white' : 
            checkedCount === totalItems ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>2</div>
          <span className="text-xs">Inspection</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'signature' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'signature' ? 'bg-blue-600 text-white' :
            signature ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>3</div>
          <span className="text-xs">Signature</span>
        </div>
      </div>

      {error && (
        <AlertBanner
          type="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="p-4">
        {/* Step 1: Mileage */}
        {currentStep === 'mileage' && (
          <MobileCard>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Enter Beginning Mileage</h2>
            <MobileInput
              label="Vehicle Mileage"
              type="text"
              inputMode="numeric"
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
                className="w-full px-4 py-3 min-h-[100px] text-base text-gray-900 border border-gray-300 rounded-lg"
                rows={4}
                maxLength={500}
                placeholder="Note any issues or concerns..."
              />
            </MobileCard>
            
            <div className="mt-4 text-center text-sm text-gray-600">
              <p className="font-medium">{checkedCount} of {totalItems} items checked</p>
            </div>
          </>
        )}

        {/* Step 3: Signature */}
        {currentStep === 'signature' && (
          <MobileCard>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Driver Signature</h2>
            <p className="text-sm text-gray-600 mb-4">
              By signing below, you confirm that you have completed the pre-trip inspection
              and the vehicle is safe to operate.
            </p>
            
            <SignatureCanvas
              onSave={setSignature}
              onClear={() => setSignature(null)}
            />
            
            {signature && (
              <p className="text-sm text-green-600 mt-2">✓ Signature captured</p>
            )}
          </MobileCard>
        )}
      </div>

      <BottomActionBarSpacer />
      
      <BottomActionBar>
        <div className="flex gap-3">
          {currentStep !== 'mileage' && (
            <TouchButton
              variant="secondary"
              onClick={() => {
                if (currentStep === 'inspection') setCurrentStep('mileage')
                if (currentStep === 'signature') setCurrentStep('inspection')
              }}
              className="flex-1"
            >
              Back
            </TouchButton>
          )}
          
          {currentStep === 'mileage' && (
            <TouchButton
              variant="secondary"
              onClick={() => router.push('/driver-portal/dashboard')}
              className="flex-1"
            >
              Cancel
            </TouchButton>
          )}
          
          {currentStep === 'mileage' && (
            <TouchButton
              variant="primary"
              onClick={() => setCurrentStep('inspection')}
              disabled={!beginningMileage}
              className="flex-1"
            >
              Next
            </TouchButton>
          )}
          
          {currentStep === 'inspection' && (
            <TouchButton
              variant="primary"
              onClick={() => setCurrentStep('signature')}
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
              {submitting ? 'Saving...' : 'Complete Inspection'}
            </TouchButton>
          )}
        </div>
      </BottomActionBar>
    </div>
  )
}

