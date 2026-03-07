'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AssignDriverSchema, type AssignDriverInput } from '@/lib/schemas/booking'
import { assignDriver } from '@/lib/actions/booking-mutations'
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
  bookingId,
  currentDriverId,
  currentDriverName,
  currentVehicleId,
  currentVehicleNumber,
  drivers,
  vehicles,
}: BookingAssignmentV2Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<AssignDriverInput>({
    resolver: zodResolver(AssignDriverSchema) as any,
    defaultValues: {
      driverId: currentDriverId || undefined,
      vehicleId: currentVehicleId || undefined,
      notifyDriver: true,
      notifyCustomer: true,
    },
  })

  const watchDriverId = watch('driverId')
  const watchVehicleId = watch('vehicleId')

  const hasChanges =
    Number(watchDriverId) !== (currentDriverId || 0) ||
    Number(watchVehicleId) !== (currentVehicleId || 0)

  const onSubmit = async (data: AssignDriverInput) => {
    setError(null)
    setSuccess(null)

    const result = await assignDriver(bookingId, data)

    if (result.success) {
      setSuccess('Assignment updated successfully')
      router.refresh()
    } else {
      setError(
        typeof result.error === 'string'
          ? result.error
          : 'Failed to update assignment'
      )
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Assignment</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Driver</label>
            {currentDriverName ? (
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {currentDriverName}
              </p>
            ) : (
              <p className="text-lg font-semibold text-red-600 mt-1">
                Not Assigned
              </p>
            )}
            <select
              {...register('driverId', { valueAsNumber: true })}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Driver...</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Vehicle</label>
            {currentVehicleNumber ? (
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {currentVehicleNumber}
              </p>
            ) : (
              <p className="text-lg font-semibold text-gray-500 mt-1">
                Not Assigned
              </p>
            )}
            <select
              {...register('vehicleId', { valueAsNumber: true })}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Vehicle...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} - {v.make} {v.model}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              {...register('notifyDriver')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Notify driver of assignment
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              {...register('notifyCustomer')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Notify customer of driver assignment
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !hasChanges}
          className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {isSubmitting ? 'Updating...' : 'Update Assignment'}
        </button>

        {!hasChanges && (currentDriverId || currentVehicleId) && (
          <p className="mt-2 text-sm text-gray-500">
            Make changes to enable the update button
          </p>
        )}
      </form>
    </div>
  )
}
