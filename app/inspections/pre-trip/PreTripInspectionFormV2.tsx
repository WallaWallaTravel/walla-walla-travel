'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PreTripInspectionSchema, type PreTripInspectionInput } from '@/lib/schemas/driver'
import { submitPreTripInspection } from '@/lib/actions/driver'
import {
  TouchButton,
  BottomActionBar,
  BottomActionBarSpacer,
  SignatureCanvas,
  MobileCard,
  AlertBanner,
  MobileCheckbox,
  MobileInput,
  haptics,
} from '@/components/mobile'
import { VoiceInspectionMode, VoiceModeFloatingButton } from '@/components/voice'
import type { AssignedVehicle } from '@/lib/types'

interface Props {
  driver: {
    id: string
    name: string
    email: string
  }
  vehicle: AssignedVehicle
}

const INSPECTION_ITEMS = {
  exterior: [
    'Tires - Check pressure and tread',
    'Lights - All working (headlights, brake, turn signals)',
    'Mirrors - Clean and properly adjusted',
    'Body damage - Note any new damage',
    'License plates - Present and clean',
    'Windows - Clean and unobstructed',
  ],
  interior: [
    'Seatbelts - All functioning properly',
    'Dashboard warning lights - None illuminated',
    'Fuel level - Adequate for route',
    'Emergency equipment - Present and accessible',
    'Cleanliness - Interior clean and organized',
    'Documentation - Registration and insurance present',
  ],
  mechanical: [
    'Brakes - Test for proper function',
    'Steering - No excessive play',
    'Horn - Working properly',
    'Windshield wipers - Functioning',
    'Fluids - Check oil, coolant, washer fluid',
    'Engine - No unusual noises or warning lights',
  ],
}

export default function PreTripInspectionFormV2({ driver, vehicle }: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<'mileage' | 'inspection' | 'signature'>('mileage')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [_itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [inspectionMode, setInspectionMode] = useState<'manual' | 'voice'>('manual')

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PreTripInspectionInput>({
    resolver: zodResolver(PreTripInspectionSchema) as any,
    defaultValues: {
      vehicle_id: vehicle.id,
      start_mileage: undefined,
      checklist_items: {},
      notes: '',
      signature: '',
    },
  })

  const [serverError, setServerError] = useState<string | null>(null)
  const startMileage = watch('start_mileage')
  const signature = watch('signature')

  const handleItemToggle = (category: string, index: number) => {
    const key = `${category}-${index}`
    const updated = { ...checkedItems, [key]: !checkedItems[key] }
    setCheckedItems(updated)
    setValue('checklist_items', updated)
  }

  // Format items for voice mode
  const voiceItems = useMemo(() => {
    const items: { id: string; category: string; text: string; checked: boolean }[] = []
    Object.entries(INSPECTION_ITEMS).forEach(([category, categoryItems]) => {
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
  }, [checkedItems])

  const handleVoiceItemCheck = (id: string, checked: boolean, note?: string) => {
    const updated = { ...checkedItems, [id]: checked }
    setCheckedItems(updated)
    setValue('checklist_items', updated)
    if (note) {
      setItemNotes(prev => ({ ...prev, [id]: note }))
    }
  }

  const handleVoiceComplete = () => {
    setInspectionMode('manual')
    setCurrentStep('signature')
    haptics.success()
  }

  const handleVoiceCancel = () => {
    setInspectionMode('manual')
  }

  const totalItems = Object.values(INSPECTION_ITEMS).reduce((acc, items) => acc + items.length, 0)
  const checkedCount = Object.values(checkedItems).filter(Boolean).length

  const handleMileageNext = () => {
    const mileage = Number(startMileage)
    if (!mileage || mileage < 0 || mileage > 9999999) {
      setServerError('Mileage must be between 0 and 9,999,999')
      haptics.error()
      return
    }
    haptics.success()
    setServerError(null)
    setCurrentStep('inspection')
  }

  const handleInspectionNext = () => {
    if (checkedCount !== totalItems) {
      setServerError(`Please complete all inspection items (${checkedCount}/${totalItems} checked)`)
      haptics.error()
      return
    }
    haptics.success()
    setServerError(null)
    setCurrentStep('signature')
  }

  const onSubmit = async (data: PreTripInspectionInput) => {
    if (!data.signature) {
      setServerError('Please sign the inspection form')
      haptics.error()
      return
    }

    setServerError(null)
    const result = await submitPreTripInspection(data)

    if (result.success) {
      haptics.success()
      router.push('/workflow')
    } else {
      const errorMessage =
        typeof result.error === 'string' ? result.error : 'Failed to submit inspection'
      setServerError(errorMessage)
      haptics.error()
    }
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
              <span>Voice</span>
            </button>
          )}
        </div>
        <p className="text-sm text-gray-800">
          Vehicle: {vehicle.vehicle_number} ({vehicle.make} {vehicle.model})
        </p>
        <p className="text-sm text-gray-800">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-between px-4 py-3 bg-white border-b">
        <div
          className={`flex-1 text-center py-2 ${
            currentStep === 'mileage' ? 'text-blue-600 font-medium' : 'text-gray-800'
          }`}
        >
          <div
            className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
              currentStep === 'mileage'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 text-white'
            }`}
          >
            1
          </div>
          <span className="text-xs">Mileage</span>
        </div>
        <div
          className={`flex-1 text-center py-2 ${
            currentStep === 'inspection' ? 'text-blue-600 font-medium' : 'text-gray-800'
          }`}
        >
          <div
            className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
              currentStep === 'inspection'
                ? 'bg-blue-600 text-white'
                : checkedCount === totalItems
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-300 text-white'
            }`}
          >
            2
          </div>
          <span className="text-xs">Inspection</span>
        </div>
        <div
          className={`flex-1 text-center py-2 ${
            currentStep === 'signature' ? 'text-blue-600 font-medium' : 'text-gray-800'
          }`}
        >
          <div
            className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
              currentStep === 'signature'
                ? 'bg-blue-600 text-white'
                : signature
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-300 text-white'
            }`}
          >
            3
          </div>
          <span className="text-xs">Signature</span>
        </div>
      </div>

      {/* Error banner */}
      {serverError && (
        <AlertBanner type="error" message={serverError} onDismiss={() => setServerError(null)} />
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
              value={String(startMileage || '')}
              onChange={(e) =>
                setValue('start_mileage', parseInt(e.target.value.replace(/\D/g, '')) || 0)
              }
              placeholder="Enter current mileage"
              maxLength={7}
              hint="Enter the current odometer reading"
            />
          </MobileCard>
        )}

        {/* Step 2: Inspection */}
        {currentStep === 'inspection' && (
          <>
            {Object.entries(INSPECTION_ITEMS).map(([category, items]) => (
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
                {...register('notes')}
                className="w-full px-4 py-3 min-h-[100px] text-base text-gray-900 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-80 placeholder:text-gray-600"
                rows={4}
                maxLength={500}
                placeholder="Note any issues or concerns..."
                style={{ fontSize: '16px' }}
              />
            </MobileCard>

            <div className="mt-4 text-center text-sm text-gray-800">
              <p className="font-medium">
                {checkedCount} of {totalItems} items checked
              </p>
              {checkedCount === totalItems && (
                <p className="text-green-600 mt-1">All items inspected</p>
              )}
            </div>
          </>
        )}

        {/* Step 3: Signature */}
        {currentStep === 'signature' && (
          <MobileCard>
            <h2 className="text-lg font-medium text-gray-900 mb-4">Driver Signature</h2>
            <p className="text-sm text-gray-800 mb-4">
              By signing below, you confirm that you have completed the pre-trip inspection and the
              vehicle is safe to operate.
            </p>

            <SignatureCanvas
              onSave={(sig) => setValue('signature', sig)}
              onClear={() => {
                setValue('signature', '')
                haptics.light()
              }}
            />

            {signature && <p className="text-sm text-green-600 mt-2">Signature captured</p>}
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
              disabled={!startMileage}
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
              onClick={handleSubmit(onSubmit)}
              disabled={!signature || isSubmitting}
              loading={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Complete Inspection'}
            </TouchButton>
          )}
        </div>
      </BottomActionBar>
    </div>
  )
}
