'use client'

import { useState } from 'react'

export default function VehicleInspection() {
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({})

  const toggleItem = (item: string, status: 'pass' | 'fail') => {
    setSelectedItems(prev => ({
      ...prev,
      [item]: status
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white p-4 sticky top-0">
        <h1 className="text-xl font-bold">Daily Vehicle Inspection</h1>
      </header>

      <form className="p-4 space-y-4">
        {/* Vehicle Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
          <select className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 text-lg">
            <option>Van #101</option>
            <option>Van #102</option>
            <option>SUV #201</option>
          </select>
        </div>

        {/* Inspection Items */}
        <div className="space-y-3">
          {['Tires', 'Brakes', 'Lights', 'Windshield', 'Mirrors', 'Seat Belts', 'Horn'].map(item => (
            <div key={item} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">{item}</span>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => toggleItem(item, 'pass')}
                    className={`px-4 py-2 rounded font-medium ${
                      selectedItems[item] === 'pass' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    ✓ Pass
                  </button>
                  <button 
                    type="button"
                    onClick={() => toggleItem(item, 'fail')}
                    className={`px-4 py-2 rounded font-medium ${
                      selectedItems[item] === 'fail' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    ✗ Fail
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea 
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
            rows={3}
            placeholder="Add any additional notes..."
          />
        </div>

        {/* Signature */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Driver Signature</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <button type="button" className="text-gray-600">
              Tap to Sign
            </button>
          </div>
        </div>

        {/* Submit */}
        <button 
          type="submit"
          className="w-full bg-gray-900 text-white py-4 rounded-lg text-lg font-medium"
        >
          Submit Inspection
        </button>
      </form>
    </div>
  )
}