'use client'

import { useState } from 'react'

export default function PostTripInspection() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [endingMileage, setEndingMileage] = useState('')
  const [fuelLevel, setFuelLevel] = useState('')
  const [restockNeeded, setRestockNeeded] = useState(false)
  const [restockNotes, setRestockNotes] = useState('')
  const [defectsFound, setDefectsFound] = useState(false)
  const [defectDetails, setDefectDetails] = useState('')
  const [vehicleSafe, setVehicleSafe] = useState(true)
  const [driverName, setDriverName] = useState('')
  const [signatureComplete, setSignatureComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const inspectionCategories = [
    {
      title: 'Vehicle Condition',
      items: [
        'No New Damage',
        'Interior Clean',
        'Trash Removed',
        'Lost Items Check',
        'Windows Closed'
      ]
    },
    {
      title: 'Mechanical Issues',
      items: [
        'No Warning Lights',
        'No Unusual Noises',
        'Brakes Felt Normal',
        'Steering Normal',
        'No Leaks Under Vehicle'
      ]
    },
    {
      title: 'Passenger Safety Equipment',
      items: [
        'All Seat Belts Functional',
        'Emergency Exits Operational',
        'Interior Lighting Working',
        'First Aid Kit Present',
        'Fire Extinguisher Accessible'
      ]
    }
  ]

  const handleToggle = (item: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }))
  }

  const handleReceiptCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'camera'
    input.onchange = (e: any) => {
      const file = e.target.files[0]
      if (file) {
        console.log('Receipt captured:', file.name)
        alert('Receipt captured - will be linked to booking')
      }
    }
    input.click()
  }

  const handleSignature = () => {
    // In production, this would open a signature capture modal
    if (!driverName.trim()) {
      alert('Please enter your name first')
      return
    }
    
    // Simulate signature capture
    const timestamp = new Date().toISOString()
    setSignatureComplete(true)
    alert(`Signature captured for ${driverName} at ${new Date(timestamp).toLocaleString()}`)
  }

  const allChecked = () => {
    const totalItems = inspectionCategories.reduce((sum, cat) => sum + cat.items.length, 0)
    const checkedCount = Object.keys(checkedItems).filter(key => checkedItems[key]).length
    return checkedCount === totalItems && 
           endingMileage !== '' && 
           fuelLevel !== '' && 
           driverName !== '' && 
           signatureComplete
  }

  const handleSubmit = () => {
    if (!endingMileage) {
      alert('Please enter ending mileage')
      return
    }
    if (!fuelLevel) {
      alert('Please select fuel level')
      return
    }
    if (!driverName) {
      alert('Please enter your name')
      return
    }
    if (!signatureComplete) {
      alert('Please provide your signature')
      return
    }
    
    // Check if any items are unchecked (potential defects)
    const totalItems = inspectionCategories.reduce((sum, cat) => sum + cat.items.length, 0)
    const checkedCount = Object.keys(checkedItems).filter(key => checkedItems[key]).length
    const hasDefects = checkedCount < totalItems || defectsFound
    
    if (hasDefects && !vehicleSafe) {
      alert('⚠️ VEHICLE MARKED UNSAFE - Maintenance will be notified immediately. Vehicle cannot be operated until repairs are certified.')
    }
    
    setSubmitting(true)
    
    // Check if fuel needs attention
    if (fuelLevel === '1/4' || fuelLevel === 'Empty') {
      console.log('ALERT: Vehicle needs fuel')
    }
    
    // Save DVIR to database
    const dvirData = {
      date: new Date().toISOString(),
      driverName: driverName,
      endingMileage: endingMileage,
      fuelLevel: fuelLevel,
      defectsFound: hasDefects,
      defectDetails: defectDetails,
      vehicleSafe: vehicleSafe,
      restockNeeded: restockNeeded,
      restockNotes: restockNotes,
      notes: notes,
      signatureTimestamp: new Date().toISOString(),
      requiresRepairs: hasDefects && !vehicleSafe
    }
    
    // Save to localStorage and mark complete
    const saved = localStorage.getItem('workflowProgress')
    if (saved) {
      const data = JSON.parse(saved)
      data.postTripDVIR = dvirData
      if (!data.completedSteps.includes('post_trip')) {
        data.completedSteps.push('post_trip')
        data.currentStep = data.currentStep + 1
      }
      localStorage.setItem('workflowProgress', JSON.stringify(data))
    }
    
    setTimeout(() => {
      window.location.href = '/workflow/daily'
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-gray-900 text-white p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.location.href = '/workflow/daily'}
              className="bg-gray-700 p-2 rounded-lg"
              title="Back to Dashboard"
            >
              🏠
            </button>
            <div>
              <h1 className="text-xl font-bold">Post-Trip Inspection (DVIR)</h1>
              <p className="text-sm text-gray-300">DOT Required Documentation</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/workflow/daily'}
            className="text-white"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="p-4">
        {/* Required Driver Info */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Driver Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
            required
          />
        </div>

        {/* Ending Mileage - Required */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ending Mileage <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={endingMileage}
            onChange={(e) => setEndingMileage(e.target.value)}
            placeholder="Enter odometer reading"
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 text-lg"
            required
          />
        </div>

        {/* Fuel Level - Required */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fuel Level <span className="text-red-500">*</span>
          </label>
          <select 
            value={fuelLevel}
            onChange={(e) => setFuelLevel(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
            required
          >
            <option value="">Select fuel level</option>
            <option value="Full">Full</option>
            <option value="3/4">3/4</option>
            <option value="1/2">1/2</option>
            <option value="1/4">1/4 (Needs Fuel)</option>
            <option value="Empty">Empty (Urgent)</option>
          </select>
          {(fuelLevel === '1/4' || fuelLevel === 'Empty') && (
            <p className="text-red-600 text-sm mt-2">
              ⚠️ Admin will be notified to arrange fueling
            </p>
          )}
        </div>

        {/* Inspection Items */}
        {inspectionCategories.map((category, catIndex) => (
          <div key={catIndex} className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {category.title}
            </h2>
            <div className="space-y-2">
              {category.items.map((item, index) => (
                <label 
                  key={index}
                  className="flex items-center bg-white p-4 rounded-lg border border-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={checkedItems[item] || false}
                    onChange={() => handleToggle(item)}
                    className="w-5 h-5 text-blue-600 rounded mr-3"
                  />
                  <span className="text-gray-900">{item}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Defects Section */}
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 mb-6">
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={defectsFound}
              onChange={(e) => setDefectsFound(e.target.checked)}
              className="mr-2"
            />
            <span className="font-semibold text-gray-900">Defects or Issues Found</span>
          </label>
          {defectsFound && (
            <>
              <textarea
                value={defectDetails}
                onChange={(e) => setDefectDetails(e.target.value)}
                placeholder="Describe all defects found (required for DVIR)"
                className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 mb-3"
                rows={3}
                required
              />
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!vehicleSafe}
                    onChange={(e) => setVehicleSafe(!e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-red-700 font-medium">
                    Vehicle is NOT safe to operate (requires immediate repair)
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Receipt Upload */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Receipts</h2>
          <button
            type="button"
            onClick={handleReceiptCapture}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600"
          >
            📸 Capture Receipt Photo
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Photos will be linked to booking for invoicing
          </p>
        </div>

        {/* Restock Needs */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={restockNeeded}
              onChange={(e) => setRestockNeeded(e.target.checked)}
              className="mr-2"
            />
            <span className="font-semibold text-gray-900">Supplies Need Restocking</span>
          </label>
          {restockNeeded && (
            <textarea
              value={restockNotes}
              onChange={(e) => setRestockNotes(e.target.value)}
              placeholder="What needs restocking? (First aid supplies, water, etc.)"
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
              rows={2}
            />
          )}
        </div>

        {/* General Notes */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
            rows={3}
            placeholder="Any other observations or concerns..."
          />
        </div>

        {/* Driver Certification & Signature */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Driver Certification</h3>
          <p className="text-sm text-gray-700 mb-3">
            I certify that I have conducted a thorough post-trip inspection of this vehicle 
            and that the above information is true and accurate. 
            {vehicleSafe ? ' The vehicle is safe for operation.' : ' The vehicle requires repairs before operation.'}
          </p>
          <button
            type="button"
            onClick={handleSignature}
            disabled={!driverName}
            className={`w-full py-3 rounded-lg font-medium ${
              signatureComplete 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-800 text-white'
            }`}
          >
            {signatureComplete ? '✓ Signed' : 'Click to Sign'}
          </button>
          {signatureComplete && (
            <p className="text-sm text-green-700 mt-2">
              Signed by {driverName} at {new Date().toLocaleString()}
            </p>
          )}
        </div>

        <button 
          onClick={handleSubmit}
          disabled={!allChecked() || submitting}
          className={`w-full py-4 rounded-lg text-lg font-medium ${
            allChecked() && !submitting
              ? 'bg-green-600 text-white' 
              : 'bg-gray-300 text-gray-500'
          }`}
        >
          {submitting ? 'Saving DVIR...' : 
           !driverName ? 'Enter Driver Name' :
           !endingMileage ? 'Enter Ending Mileage' :
           !fuelLevel ? 'Select Fuel Level' :
           !signatureComplete ? 'Driver Signature Required' :
           'Submit DVIR'}
        </button>
      </div>
    </div>
  )
}