'use client'

import { useState } from 'react'
import { saveInspectionAction } from '@/app/actions/inspections'
import { sanitizeText, sanitizeNumber, patterns } from '@/lib/security'

interface Props {
  driver: {
    id: string
    name: string
    email: string
  }
}

export default function PreTripInspectionClient({ driver }: Props) {
  const [beginningMileage, setBeginningMileage] = useState('')
  const [notes, setNotes] = useState('')
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Validate mileage
      if (!patterns.mileage.test(beginningMileage)) {
        throw new Error('Invalid mileage format')
      }
      
      const mileage = sanitizeNumber(beginningMileage)
      if (!mileage || mileage < 0 || mileage > 9999999) {
        throw new Error('Mileage must be between 0 and 9,999,999')
      }

      // Sanitize notes
      const sanitizedNotes = sanitizeText(notes)

      // Save inspection using server action
      const result = await saveInspectionAction({
        driverId: driver.id,
        vehicleId: 'a76d7f02-1802-4cf2-9afc-3a66a788ff95', // TODO: Dynamic vehicle selection
        type: 'pre_trip',
        items: checkedItems,
        notes: sanitizedNotes || null,
        beginningMileage: mileage
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save inspection')
      }

      // Redirect to next workflow step
      window.location.href = '/workflow/daily'
      
    } catch (error) {
      console.error('Submission error:', error)
      alert(error instanceof Error ? error.message : 'Error saving inspection')
      setSubmitting(false)
    }
  }

  const allItemsChecked = Object.values(checkedItems).filter(Boolean).length === 
    Object.values(inspectionItems).reduce((acc, items) => acc + items.length, 0)

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Pre-Trip Inspection</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">Driver: {driver.name}</p>
            <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beginning Mileage
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{1,7}"
                value={beginningMileage}
                onChange={(e) => setBeginningMileage(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                maxLength={7}
              />
            </div>

            {Object.entries(inspectionItems).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h2 className="text-xl font-semibold mb-3 capitalize">
                  {category.replace('_', ' ')} Inspection
                </h2>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <label key={index} className="flex items-center p-3 bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={checkedItems[`${category}-${index}`] || false}
                        onChange={() => handleItemToggle(category, index)}
                        className="mr-3 h-5 w-5 text-blue-600"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                maxLength={500}
                placeholder="Note any issues or concerns..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {notes.length}/500 characters
              </p>
            </div>

            <div className="flex justify-between">
              <a
                href="/workflow/daily"
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back to Workflow
              </a>
              
              <button
                type="submit"
                disabled={submitting || !allItemsChecked || !beginningMileage}
                className={`px-6 py-2 rounded-md text-white font-medium
                  ${submitting || !allItemsChecked || !beginningMileage
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {submitting ? 'Submitting...' : 'Complete Inspection'}
              </button>
            </div>
            
            {!allItemsChecked && (
              <p className="text-sm text-red-600 text-center mt-4">
                Please check all inspection items before submitting.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
