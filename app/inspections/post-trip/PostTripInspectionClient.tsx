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
  beginningMileage?: number
}

interface Defect {
  id: string
  description: string
  severity: 'minor' | 'major' | 'critical'
  photo?: string
}

export function PostTripInspectionClient({ driver, beginningMileage = 0 }: Props) {
  const [currentStep, setCurrentStep] = useState<'mileage' | 'inspection' | 'defects' | 'dvir'>('mileage')
  const [endingMileage, setEndingMileage] = useState('')
  const [fuelLevel, setFuelLevel] = useState('')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [hasDefects, setHasDefects] = useState<boolean | null>(null)
  const [defects, setDefects] = useState<Defect[]>([])
  const [currentDefect, setCurrentDefect] = useState<Partial<Defect>>({
    description: '',
    severity: 'minor'
  })
  const [vehicleSafe, setVehicleSafe] = useState(true)
  const [driverSignature, setDriverSignature] = useState<string | null>(null)
  const [mechanicSignature, setMechanicSignature] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inspectionItems = {
    vehicle_condition: [
      'No new damage to vehicle',
      'Interior clean and organized',
      'All trash removed',
      'Lost items check completed',
      'All windows closed and locked'
    ],
    mechanical: [
      'No dashboard warning lights',
      'No unusual noises detected',
      'Brakes functioning properly',
      'Steering responsive',
      'No visible leaks under vehicle'
    ],
    safety_equipment: [
      'All seat belts functional',
      'Emergency exits operational',
      'Interior lighting working',
      'First aid kit present',
      'Fire extinguisher accessible'
    ],
    accessibility: [
      'Wheelchair lift/ramp secured',
      'Tie-downs properly stored',
      'Accessibility equipment functional',
      'Passenger assists working'
    ]
  }

  const handleItemToggle = (category: string, index: number) => {
    const key = `${category}-${index}`
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleMileageNext = () => {
    if (!endingMileage) {
      setError('Please enter ending mileage')
      haptics.error()
      return
    }

    const mileage = sanitizeNumber(endingMileage)
    if (!mileage || mileage < 0 || mileage > 9999999) {
      setError('Mileage must be between 0 and 9,999,999')
      haptics.error()
      return
    }

    if (beginningMileage && mileage < beginningMileage) {
      setError(`Ending mileage must be greater than beginning mileage (${beginningMileage})`)
      haptics.error()
      return
    }

    if (!fuelLevel) {
      setError('Please select fuel level')
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
    setCurrentStep('defects')
  }

  const handleDefectsNext = () => {
    if (hasDefects === null) {
      setError('Please indicate if defects were found')
      haptics.error()
      return
    }

    if (hasDefects && defects.length === 0) {
      if (!currentDefect.description?.trim()) {
        setError('Please describe the defect or add it to the list')
        haptics.error()
        return
      }
      // Auto-add current defect if user forgot to click Add
      handleAddDefect()
    }

    haptics.success()
    setError(null)
    setCurrentStep('dvir')
  }

  const handleAddDefect = () => {
    if (!currentDefect.description?.trim()) {
      setError('Please describe the defect')
      haptics.error()
      return
    }

    const newDefect: Defect = {
      id: Date.now().toString(),
      description: currentDefect.description.trim(),
      severity: currentDefect.severity || 'minor',
      photo: currentDefect.photo
    }

    setDefects(prev => [...prev, newDefect])
    setCurrentDefect({ description: '', severity: 'minor' })
    haptics.success()
  }

  const handleRemoveDefect = (id: string) => {
    setDefects(prev => prev.filter(d => d.id !== id))
    haptics.light()
  }

  const handlePhotoUpload = () => {
    // In a real app, this would open the camera or file picker
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file) {
        // In production, upload to storage and get URL
        const mockUrl = URL.createObjectURL(file)
        setCurrentDefect(prev => ({ ...prev, photo: mockUrl }))
        haptics.success()
      }
    }
    input.click()
  }

  const handleDriverSignatureClear = () => {
    setDriverSignature(null)
    haptics.light()
  }

  const handleMechanicSignatureClear = () => {
    setMechanicSignature(null)
    haptics.light()
  }

  const handleSubmit = async () => {
    if (!driverSignature) {
      setError('Driver signature required for DVIR')
      haptics.error()
      return
    }

    if (hasDefects && !vehicleSafe && !mechanicSignature) {
      setError('Mechanic signature required when vehicle is unsafe')
      haptics.error()
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const mileage = sanitizeNumber(endingMileage)
      const sanitizedNotes = sanitizeText(notes)

      // Save inspection using server action
      const result = await saveInspectionAction({
        driverId: driver.id,
        vehicleId: 'a76d7f02-1802-4cf2-9afc-3a66a788ff95', // TODO: Dynamic vehicle selection
        type: 'post_trip',
        items: checkedItems,
        notes: sanitizedNotes || null,
        endingMileage: mileage,
        signature: driverSignature,
        // Additional post-trip specific data
        fuelLevel,
        defects: defects.length > 0 ? JSON.stringify(defects) : null,
        vehicleSafe,
        mechanicSignature: mechanicSignature || null
      } as any)

      if (!result.success) {
        throw new Error(result.error || 'Failed to save inspection')
      }

      haptics.success()
      // Redirect to workflow
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

  const needsMechanicSignature = hasDefects && !vehicleSafe

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-xl font-semibold">Post-Trip Inspection (DVIR)</h1>
        <p className="text-sm text-gray-600">Driver: {driver.name}</p>
        <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-between px-4 py-3 bg-white border-b">
        <div className={`flex-1 text-center py-2 ${currentStep === 'mileage' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'mileage' ? 'bg-blue-600 text-white' : 
            endingMileage && fuelLevel ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>1</div>
          <span className="text-xs">Mileage</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'inspection' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'inspection' ? 'bg-blue-600 text-white' : 
            allItemsChecked ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>2</div>
          <span className="text-xs">Inspection</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'defects' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'defects' ? 'bg-blue-600 text-white' : 
            hasDefects !== null ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>3</div>
          <span className="text-xs">Defects</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'dvir' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'dvir' ? 'bg-blue-600 text-white' :
            driverSignature ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>4</div>
          <span className="text-xs">DVIR</span>
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
        {/* Step 1: Ending Mileage & Fuel */}
        {currentStep === 'mileage' && (
          <>
            <MobileCard>
              <h2 className="text-lg font-medium mb-4">Vehicle Status</h2>
              
              <MobileInput
                label="Ending Mileage"
                type="text"
                inputMode="numeric"
                pattern="\d{1,7}"
                value={endingMileage}
                onChange={(e) => setEndingMileage(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter ending mileage"
                maxLength={7}
                hint={beginningMileage ? `Beginning mileage was ${beginningMileage}` : 'Enter the final odometer reading'}
              />

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuel Level
                </label>
                <select 
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  className="w-full px-4 py-3 min-h-[48px] text-base border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  style={{ fontSize: '16px' }}
                >
                  <option value="">Select fuel level</option>
                  <option value="Full">Full</option>
                  <option value="3/4">3/4 Tank</option>
                  <option value="1/2">1/2 Tank</option>
                  <option value="1/4">1/4 Tank ⚠️</option>
                  <option value="Empty">Empty 🚨</option>
                </select>
                {(fuelLevel === '1/4' || fuelLevel === 'Empty') && (
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ Low fuel - admin will be notified
                  </p>
                )}
              </div>
            </MobileCard>
          </>
        )}

        {/* Step 2: Inspection Checklist */}
        {currentStep === 'inspection' && (
          <>
            {Object.entries(inspectionItems).map(([category, items]) => (
              <MobileCard key={category} className="mb-4">
                <h2 className="text-lg font-medium mb-3 capitalize">
                  {category.replace(/_/g, ' ')} Check
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
                placeholder="Any observations or concerns..."
                style={{ fontSize: '16px' }}
              />
              <p className="text-sm text-gray-500 mt-2">
                {notes.length}/500 characters
              </p>
            </MobileCard>
            
            <div className="mt-4 text-center text-sm text-gray-600">
              <p className="font-medium">{checkedCount} of {totalItems} items checked</p>
              {allItemsChecked && (
                <p className="text-green-600 mt-1">✓ All items inspected</p>
              )}
            </div>
          </>
        )}

        {/* Step 3: Defects Reporting */}
        {currentStep === 'defects' && (
          <>
            <MobileCard>
              <h2 className="text-lg font-medium mb-4">Report Defects</h2>
              
              {hasDefects === null ? (
                <div className="space-y-3">
                  <TouchButton
                    variant="secondary"
                    onClick={() => {
                      setHasDefects(false)
                      haptics.light()
                    }}
                    className="w-full"
                  >
                    ✓ No Defects Found
                  </TouchButton>
                  <TouchButton
                    variant="primary"
                    onClick={() => {
                      setHasDefects(true)
                      haptics.light()
                    }}
                    className="w-full bg-orange-600"
                  >
                    ⚠️ Yes, Report Defects
                  </TouchButton>
                </div>
              ) : hasDefects ? (
                <div>
                  {/* Defect input form */}
                  <div className="mb-4">
                    <textarea
                      value={currentDefect.description || ''}
                      onChange={(e) => setCurrentDefect(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 min-h-[100px] text-base border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                      placeholder="Describe the defect..."
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Severity
                    </label>
                    <div className="flex gap-2">
                      <TouchButton
                        variant={currentDefect.severity === 'minor' ? 'primary' : 'secondary'}
                        onClick={() => setCurrentDefect(prev => ({ ...prev, severity: 'minor' }))}
                        className="flex-1"
                      >
                        Minor
                      </TouchButton>
                      <TouchButton
                        variant={currentDefect.severity === 'major' ? 'primary' : 'secondary'}
                        onClick={() => setCurrentDefect(prev => ({ ...prev, severity: 'major' }))}
                        className="flex-1 bg-orange-600"
                      >
                        Major
                      </TouchButton>
                      <TouchButton
                        variant={currentDefect.severity === 'critical' ? 'primary' : 'secondary'}
                        onClick={() => setCurrentDefect(prev => ({ ...prev, severity: 'critical' }))}
                        className="flex-1 bg-red-600"
                      >
                        Critical
                      </TouchButton>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <TouchButton
                      variant="secondary"
                      onClick={handlePhotoUpload}
                      className="flex-1"
                    >
                      📷 Add Photo
                    </TouchButton>
                    <TouchButton
                      variant="primary"
                      onClick={handleAddDefect}
                      disabled={!currentDefect.description?.trim()}
                      className="flex-1"
                    >
                      Add Defect
                    </TouchButton>
                  </div>

                  {currentDefect.photo && (
                    <img 
                      src={currentDefect.photo} 
                      alt="Defect" 
                      className="w-full h-32 object-cover rounded-lg mb-4"
                    />
                  )}

                  {/* List of added defects */}
                  {defects.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium mb-2">Reported Defects ({defects.length})</h3>
                      {defects.map(defect => (
                        <div key={defect.id} className="bg-gray-50 p-3 rounded-lg mb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className={`inline-block px-2 py-1 text-xs rounded ${
                                defect.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                defect.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {defect.severity.toUpperCase()}
                              </span>
                              <p className="mt-1">{defect.description}</p>
                              {defect.photo && <span className="text-sm text-gray-500">📷 Photo attached</span>}
                            </div>
                            <button
                              onClick={() => handleRemoveDefect(defect.id)}
                              className="ml-2 text-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vehicle safety question */}
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!vehicleSafe}
                        onChange={(e) => setVehicleSafe(!e.target.checked)}
                        className="mr-3 h-5 w-5"
                      />
                      <span className="text-red-700 font-medium">
                        Vehicle is NOT safe to operate (requires immediate repair)
                      </span>
                    </label>
                  </div>

                  <TouchButton
                    variant="secondary"
                    onClick={() => {
                      setHasDefects(null)
                      setDefects([])
                      setCurrentDefect({ description: '', severity: 'minor' })
                      haptics.light()
                    }}
                    className="w-full mt-4"
                  >
                    ← Change Selection
                  </TouchButton>
                </div>
              ) : (
                <div>
                  <p className="text-green-600 font-medium mb-4">
                    ✓ No defects found - vehicle in good condition
                  </p>
                  <TouchButton
                    variant="secondary"
                    onClick={() => {
                      setHasDefects(null)
                      haptics.light()
                    }}
                    className="w-full"
                  >
                    ← Change Selection
                  </TouchButton>
                </div>
              )}
            </MobileCard>
          </>
        )}

        {/* Step 4: DVIR Signature */}
        {currentStep === 'dvir' && (
          <>
            <MobileCard>
              <h2 className="text-lg font-medium mb-4">Driver Vehicle Inspection Report</h2>
              
              {/* Summary */}
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <h3 className="font-medium mb-2">Inspection Summary</h3>
                <ul className="text-sm space-y-1">
                  <li>• Ending Mileage: {endingMileage}</li>
                  <li>• Fuel Level: {fuelLevel}</li>
                  <li>• Items Inspected: {checkedCount}/{totalItems}</li>
                  <li>• Defects Found: {defects.length > 0 ? `Yes (${defects.length})` : 'No'}</li>
                  {!vehicleSafe && (
                    <li className="text-red-600 font-medium">• ⚠️ VEHICLE UNSAFE - REQUIRES REPAIR</li>
                  )}
                </ul>
              </div>

              {/* Driver Certification */}
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-3">
                  I certify that I have conducted a thorough post-trip inspection of this vehicle 
                  and that the above information is true and accurate.
                  {vehicleSafe ? ' The vehicle is safe for operation.' : ' The vehicle requires repairs before operation.'}
                </p>
                
                <SignatureCanvas
                  label="Driver Signature"
                  onSignature={setDriverSignature}
                  onClear={handleDriverSignatureClear}
                />
                
                {driverSignature && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Signed by {driver.name} at {new Date().toLocaleTimeString()}
                  </p>
                )}
              </div>

              {/* Mechanic Signature (if needed) */}
              {needsMechanicSignature && (
                <div className="border-t pt-4">
                  <h3 className="font-medium text-red-700 mb-2">
                    ⚠️ Mechanic Certification Required
                  </h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Due to critical defects, a certified mechanic must review and sign off on this vehicle.
                  </p>
                  
                  <SignatureCanvas
                    label="Mechanic Signature"
                    onSignature={setMechanicSignature}
                    onClear={handleMechanicSignatureClear}
                  />
                  
                  {mechanicSignature && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Mechanic signature captured
                    </p>
                  )}
                </div>
              )}
            </MobileCard>
          </>
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
                if (currentStep === 'defects') setCurrentStep('inspection')
                if (currentStep === 'dvir') setCurrentStep('defects')
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
              disabled={!endingMileage || !fuelLevel}
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
          
          {currentStep === 'defects' && (
            <TouchButton
              variant="primary"
              onClick={handleDefectsNext}
              disabled={hasDefects === null || (hasDefects && defects.length === 0 && !currentDefect.description?.trim())}
              className="flex-1"
            >
              Next
            </TouchButton>
          )}
          
          {currentStep === 'dvir' && (
            <TouchButton
              variant="primary"
              onClick={handleSubmit}
              disabled={!driverSignature || (needsMechanicSignature && !mechanicSignature) || submitting}
              loading={submitting}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Complete DVIR'}
            </TouchButton>
          )}
        </div>
      </BottomActionBar>
    </div>
  )
}

// Default export for backward compatibility
export default PostTripInspectionClient