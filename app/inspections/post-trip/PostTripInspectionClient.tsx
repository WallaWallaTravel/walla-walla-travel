'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import api from '@/lib/api-client'
import { sanitizeText, sanitizeNumber } from '@/lib/security'
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
import type { Vehicle } from '@/lib/types'

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
  const router = useRouter()
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
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loadingVehicle, setLoadingVehicle] = useState(true)

  useEffect(() => {
    loadVehicleAndStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadVehicleAndStatus() {
    try {
      // Load vehicle from active time card (the one the driver is currently clocked into)
      const clockStatusResponse = await fetch('/api/workflow/clock', {
        method: 'GET',
        credentials: 'include',
      })

      if (clockStatusResponse.ok) {
        const clockData = await clockStatusResponse.json()
        if (clockData.success && clockData.data?.status === 'clocked_in') {
          const timeCard = clockData.data.timeCard

          // Extract vehicle info from the active time card
          if (timeCard?.vehicle_id) {
            const vehicleData: Vehicle = {
              id: timeCard.vehicle_id as number,
              vehicle_number: timeCard.vehicle_number as string,
              make: timeCard.make as string,
              model: timeCard.model as string,
              current_mileage: (timeCard.current_mileage || 0) as number,
              is_active: true,
              status: 'in_use' as const,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            setVehicle(vehicleData)

            // Use vehicle's current mileage as minimum
            if (!beginningMileage && vehicleData.current_mileage) {
              setEndingMileage(vehicleData.current_mileage.toString())
            }
          } else {
            setError('No vehicle found in active shift. Please contact your supervisor.')
          }
        } else {
          setError('You must be clocked in to complete post-trip inspection.')
        }
      } else {
        setError('Failed to load active shift information.')
      }
    } catch (_err) {
      setError('Failed to load vehicle information')
    } finally {
      setLoadingVehicle(false)
    }
  }

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
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
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

    if (!vehicle) {
      setError('No vehicle assigned')
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

      // Determine overall defect severity (highest severity wins)
      const hasCriticalDefect = defects.some(d => d.severity === 'critical')
      const defectSeverity = hasDefects === false ? 'none' :
                            hasCriticalDefect ? 'critical' : 'minor'

      // Combine all defect descriptions
      const defectDescription = defects.length > 0
        ? defects.map(d => `[${d.severity.toUpperCase()}] ${d.description}`).join('\n\n')
        : null

      // Save inspection using API
      const result = await api.inspection.submitPostTrip({
        vehicleId: vehicle.id,
        endMileage: mileage || 0,
        inspectionData: {
          items: checkedItems,
          notes: sanitizedNotes || '',
          fuelLevel,
          signature: driverSignature,
          defects: defects.length > 0 ? defects : [],
          vehicleSafe,
          mechanicSignature: mechanicSignature || null,
          // New defect tracking fields
          defectsFound: hasDefects || false,
          defectSeverity: defectSeverity,
          defectDescription: defectDescription
        }
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save inspection')
      }

      haptics.success()

      // Show confirmation message for critical defects
      if (defectSeverity === 'critical') {
        // Critical defect notification will be handled by backend
        alert('✅ Post-trip inspection submitted\n⚠️ Critical defect reported - Supervisor notified\n🚫 Vehicle marked out of service\n\nYour supervisor has been notified via text and email about the critical issue you reported. Thank you for keeping everyone safe!')
      }

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

  const needsMechanicSignature = hasDefects && !vehicleSafe

  if (loadingVehicle) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-800">Loading vehicle information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">Post-Trip Inspection (DVIR)</h1>
        <p className="text-sm text-gray-800">Driver: {driver.name}</p>
        {vehicle && (
          <p className="text-sm text-gray-800">Vehicle: {vehicle.vehicle_number} ({vehicle.make} {vehicle.model})</p>
        )}
        <p className="text-sm text-gray-800">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-between px-4 py-3 bg-white border-b">
        <div className={`flex-1 text-center py-2 ${currentStep === 'mileage' ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'mileage' ? 'bg-blue-600 text-white' : 
            endingMileage && fuelLevel ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>1</div>
          <span className="text-xs">Mileage</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'inspection' ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'inspection' ? 'bg-blue-600 text-white' : 
            allItemsChecked ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>2</div>
          <span className="text-xs">Inspection</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'defects' ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
            currentStep === 'defects' ? 'bg-blue-600 text-white' : 
            hasDefects !== null ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
          }`}>3</div>
          <span className="text-xs">Defects</span>
        </div>
        <div className={`flex-1 text-center py-2 ${currentStep === 'dvir' ? 'text-blue-600 font-medium' : 'text-gray-800'}`}>
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
              <h2 className="text-lg font-medium text-gray-900 mb-4">Vehicle Status</h2>
              
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
                  className="w-full px-4 py-3 min-h-[48px] text-base text-gray-900 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-80"
                  style={{ fontSize: '16px' }}
                >
                  <option value="" className="text-gray-900">Select fuel level</option>
                  <option value="Full" className="text-gray-900">Full</option>
                  <option value="3/4" className="text-gray-900">3/4 Tank</option>
                  <option value="1/2" className="text-gray-900">1/2 Tank</option>
                  <option value="1/4" className="text-gray-900">1/4 Tank ⚠️</option>
                  <option value="Empty" className="text-gray-900">Empty 🚨</option>
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
                <h2 className="text-lg font-medium text-gray-900 mb-3 capitalize">
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
              <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 min-h-[100px] text-base text-gray-900 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-80 placeholder:text-gray-600"
                rows={4}
                maxLength={500}
                placeholder="Any observations or concerns..."
                style={{ fontSize: '16px' }}
              />
              <p className="text-sm text-gray-700 mt-2">
                {notes.length}/500 characters
              </p>
            </MobileCard>
            
            <div className="mt-4 text-center text-sm text-gray-800">
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
              <h2 className="text-lg font-medium text-gray-900 mb-4">Report Defects</h2>
              
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
                      className="w-full px-4 py-3 min-h-[100px] text-base text-gray-900 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-80 placeholder:text-gray-600"
                      placeholder="Describe the defect..."
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What is the severity?
                    </label>
                    <div className="space-y-2">
                      <TouchButton
                        variant={currentDefect.severity === 'minor' ? 'primary' : 'secondary'}
                        onClick={() => setCurrentDefect(prev => ({ ...prev, severity: 'minor' }))}
                        className="w-full text-left"
                      >
                        <div>
                          <div className="font-medium">Minor</div>
                          <div className="text-sm opacity-80">Vehicle still safe to drive, can be addressed later</div>
                        </div>
                      </TouchButton>
                      <TouchButton
                        variant={currentDefect.severity === 'critical' ? 'primary' : 'secondary'}
                        onClick={() => setCurrentDefect(prev => ({ ...prev, severity: 'critical' }))}
                        className="w-full text-left bg-red-600"
                      >
                        <div>
                          <div className="font-medium">Critical</div>
                          <div className="text-sm opacity-80">Vehicle unsafe, needs immediate attention</div>
                        </div>
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
                    <div className="relative w-full h-32 mb-4">
                      <Image
                        src={currentDefect.photo}
                        alt="Defect"
                        fill
                        className="object-cover rounded-lg"
                        unoptimized
                      />
                    </div>
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
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {defect.severity.toUpperCase()}
                              </span>
                              <p className="mt-1 text-gray-900">{defect.description}</p>
                              {defect.photo && <span className="text-sm text-gray-700">📷 Photo attached</span>}
                            </div>
                            <button
                              onClick={() => handleRemoveDefect(defect.id)}
                              className="ml-2 text-red-600 font-bold text-xl"
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
              <h2 className="text-lg font-medium text-gray-900 mb-4">Driver Vehicle Inspection Report</h2>
              
              {/* Summary */}
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Inspection Summary</h3>
                <ul className="text-sm text-gray-800 space-y-1">
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
                  onSave={setDriverSignature}
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
                    onSave={setMechanicSignature}
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