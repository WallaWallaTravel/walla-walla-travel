'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClockInSchema, type ClockInInput } from '@/lib/schemas/driver'
import { clockIn } from '@/lib/actions/driver'
import { getVehiclesForClockIn } from '@/lib/actions/driver-queries'
import {
  TouchButton,
  MobileCard,
  AlertBanner,
  BottomActionBar,
  BottomActionBarSpacer,
} from '@/components/mobile'

interface Vehicle {
  id: number
  vehicle_number: string | null
  capacity: number | null
  make: string
  model: string
  in_use: boolean
  in_use_by_me: boolean
}

interface Location {
  latitude: number
  longitude: number
  accuracy: number
}

interface ClockInFormProps {
  driverName: string
}

export default function ClockInForm({ driverName }: ClockInFormProps) {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [location, setLocation] = useState<Location | null>(null)
  const [locationError, setLocationError] = useState<string>('')
  const [serverError, setServerError] = useState('')

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ClockInInput>({
    resolver: zodResolver(ClockInSchema) as any,
    defaultValues: {
      vehicle_id: undefined,
      location: undefined,
      notes: '',
    },
  })

  const selectedVehicle = watch('vehicle_id')

  // Load vehicles via server action
  const loadVehicles = useCallback(async () => {
    const result = await getVehiclesForClockIn()
    if (result.success && result.data) {
      const vehicleData = (result.data as { vehicles: Vehicle[] }).vehicles
      setVehicles(vehicleData || [])
    }
  }, [])

  // Get geolocation
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Location services not available')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setLocation(loc)
        setValue('location', loc)
        setLocationError('')
      },
      (geoError) => {
        setLocationError(`Location error: ${geoError.message}`)
      }
    )
  }, [setValue])

  useEffect(() => {
    loadVehicles()
    getLocation()
  }, [loadVehicles, getLocation])

  const onSubmit = async (data: ClockInInput) => {
    setServerError('')

    const result = await clockIn(data)

    if (result.success) {
      router.push('/time-clock/dashboard')
    } else {
      const errorMessage =
        typeof result.error === 'string'
          ? result.error
          : 'Failed to clock in'
      setServerError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-32">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900">Clock In</h1>
          <p className="text-gray-800 mt-2">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Location Status */}
        {location ? (
          <AlertBanner
            type="success"
            message={`Location acquired (+-${Math.round(location.accuracy)}m accuracy)`}
          />
        ) : locationError ? (
          <AlertBanner
            type="warning"
            message="Location unavailable - you can still clock in without it"
          />
        ) : (
          <AlertBanner type="info" message="Getting your location..." />
        )}

        {/* Error Alert */}
        {serverError && (
          <AlertBanner
            type="error"
            message={serverError}
            dismissible
            onDismiss={() => setServerError('')}
          />
        )}

        {/* Logged-in Driver */}
        <MobileCard title="Driver" variant="elevated">
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
              {driverName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{driverName}</p>
              <p className="text-sm text-gray-600">Logged in</p>
            </div>
          </div>
        </MobileCard>

        {/* Vehicle Selection */}
        <MobileCard title="Select Vehicle" variant="elevated">
          <div className="space-y-2">
            {vehicles.length > 0 ? (
              vehicles
                .filter((v) => !v.in_use || v.in_use_by_me)
                .map((vehicle) => (
                  <TouchButton
                    key={vehicle.id}
                    variant={selectedVehicle === vehicle.id ? 'primary' : 'secondary'}
                    size="large"
                    fullWidth
                    onClick={() => setValue('vehicle_id', vehicle.id)}
                  >
                    <div className="text-left w-full">
                      <div className="font-semibold">{vehicle.vehicle_number}</div>
                      <div className="text-sm opacity-90">
                        {vehicle.make} {vehicle.model} {vehicle.capacity ? `- ${vehicle.capacity} passengers` : ''}
                      </div>
                    </div>
                  </TouchButton>
                ))
            ) : (
              <p className="text-gray-600 text-center py-2">Loading vehicles...</p>
            )}
          </div>
        </MobileCard>

        {/* Compliance Reminder */}
        <MobileCard variant="bordered">
          <div className="space-y-2 text-sm text-gray-700">
            <h3 className="font-semibold text-base">Today&apos;s Requirements:</h3>
            <ul className="space-y-1 ml-4">
              <li>Pre-trip inspection before departure</li>
              <li>Maximum 10 hours driving</li>
              <li>Maximum 15 hours on-duty</li>
              <li>Minimum 8 hours off-duty before next shift</li>
            </ul>
          </div>
        </MobileCard>

        <BottomActionBarSpacer />
      </div>

      {/* Bottom Action Bar */}
      <BottomActionBar>
        <TouchButton
          variant="secondary"
          size="large"
          fullWidth
          onClick={() => router.back()}
        >
          Cancel
        </TouchButton>
        <TouchButton
          variant="primary"
          size="large"
          fullWidth
          onClick={handleSubmit(onSubmit)}
          disabled={!selectedVehicle || isSubmitting}
        >
          {isSubmitting ? 'Clocking In...' : 'Clock In Now'}
        </TouchButton>
      </BottomActionBar>
    </div>
  )
}
