'use client'

// TODO: Rebuild with useActionState (fresh build)

import type { AssignedVehicle } from '@/lib/types'

interface Props {
  driver: {
    id: string
    name: string
    email: string
  }
  vehicle: AssignedVehicle
}

export default function PreTripInspectionFormV2({ driver, vehicle }: Props) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-xl font-semibold text-gray-900">Pre-Trip Inspection</h1>
        <p className="text-sm text-gray-800">Driver: {driver.name}</p>
        <p className="text-sm text-gray-800">
          Vehicle: {vehicle.vehicle_number} ({vehicle.make} {vehicle.model})
        </p>
        <p className="text-sm text-gray-800">Date: {new Date().toLocaleDateString()}</p>
      </div>
      <div className="p-4">
        <p className="text-gray-700">This form will be rebuilt with useActionState.</p>
      </div>
    </div>
  )
}
