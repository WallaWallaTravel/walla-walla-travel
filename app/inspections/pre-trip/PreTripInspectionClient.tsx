'use client'

import { useState } from 'react'
import { saveInspectionAction } from '@/app/actions/inspections'
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

interface Props {
  driver: {
    id: string
    name: string
    email: string
  }
}

export function PreTripInspectionClient({ driver }: Props) {
  const [currentStep, setCurrentStep] = useState<'mileage' | 'inspection' | 'signature'>('mileage')
  const [beginningMileage, setBeginningMileage] = useState('')
  const [notes, setNotes] = useState('')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    ],
    accessibility: [
      'Wheelchair lift/ramp - Operates properly',
      'Tie-downs - Present and in good condition',
      'Wheelchair positions - Clear and accessible',
      'Safety equipment - All present',
      'Communication devices - Working'
    ]
  }

  const handleItemToggle = (category: string, index: number) => {
    const key = `${category}-${index}`
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
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

    setSubmitting(true)
    setError(null)

    try {
      const mileage = sanitizeNumber(beginningMileage)
      const sanitizedNotes = sanitizeText(notes)

      // Save inspection using server action
      const result = await saveInspectionAction({
        driverId: driver.id,
        vehicleId: 'a76d7f02-1802-4cf2-9afc-3a66a788ff95', // TODO: Dynamic vehicle selection
        type: 'pre_trip',
        items: checkedItems,
        notes: sanitizedNotes || null,
        beginningMileage: mileage,
        signature
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save inspection')
      }

      haptics.success()
      // Redirect to next workflow step
      window.location.href = '/workflow/daily'
      
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-xl font-semibold">Pre-Trip Inspection</h1>
        <p className="text-sm text-gray-600">Driver: {driver.name}</p>
        <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-between px-4 py-3 bg-white border-b">
        <div className={`flex-1 text-center py-2 ${currentStep === 'mileage' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'mileage' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'
          }`}>1</div>
          <span className="text-xs">Mileage</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'inspection' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'inspection' ? 'bg-blue-600 text-white' : 
            checkedCount === totalItems ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>2</div>
          <span className="text-xs">Inspection</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'signature' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
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
            <h2 className="text-lg font-medium mb-4">Enter Beginning Mileage</h2>
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
                <h2 className="text-lg font-medium mb-3 capitalize">
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
              <h3 className="text-lg font-medium mb-3">Additional Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 min-h-[100px] text-base border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                rows={4}
                maxLength={500}
                placeholder="Note any issues or concerns..."
                style={{ fontSize: '16px' }}
              />
              <p className="text-sm text-gray-500 mt-2">
                {notes.length}/500 characters
              </p>
            </MobileCard>
            
            <div className="mt-4 text-center text-sm text-gray-600">
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
            <h2 className="text-lg font-medium mb-4">Driver Signature</h2>
            <p className="text-sm text-gray-600 mb-4">
              By signing below, you confirm that you have completed the pre-trip inspection
              and the vehicle is safe to operate.
            </p>
            
            <SignatureCanvas
              onSignature={setSignature}
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
                window.location.href = '/workflow/daily'
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
