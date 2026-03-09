'use client'

// TODO: Rebuild with useActionState (fresh build)

import type { DriverOption, VehicleOption } from '@/lib/actions/booking-queries'

interface BookingAssignmentV2Props {
  bookingId: number
  currentDriverId: number | null
  currentDriverName: string | null
  currentVehicleId: number | null
  currentVehicleNumber: string | null
  drivers: DriverOption[]
  vehicles: VehicleOption[]
}

export function BookingAssignmentV2({
  currentDriverName,
  currentVehicleNumber,
}: BookingAssignmentV2Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Assignment</h2>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium text-gray-500">Driver</label>
          {currentDriverName ? (
            <p className="text-lg font-semibold text-gray-900 mt-1">{currentDriverName}</p>
          ) : (
            <p className="text-lg font-semibold text-red-600 mt-1">Not Assigned</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500">Vehicle</label>
          {currentVehicleNumber ? (
            <p className="text-lg font-semibold text-gray-900 mt-1">{currentVehicleNumber}</p>
          ) : (
            <p className="text-lg font-semibold text-gray-500 mt-1">Not Assigned</p>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-700">Assignment form will be rebuilt with useActionState.</p>
    </div>
  )
}
