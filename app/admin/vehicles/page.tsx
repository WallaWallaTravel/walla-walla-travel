import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import VehiclesList, { type VehicleRow } from './VehiclesList'

export const metadata = {
  title: 'Vehicles | Admin',
  description: 'View and manage vehicle fleet and compliance status',
}

export default async function VehiclesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Fetch all vehicles
  const vehiclesRaw = await prisma.vehicles.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      vehicle_number: true,
      make: true,
      model: true,
      year: true,
      license_plate: true,
      status: true,
      is_active: true,
      current_mileage: true,
      capacity: true,
      insurance_expiry: true,
      registration_expiry: true,
      next_service_due: true,
    },
  })

  // Calculate stats
  const totalVehicles = vehiclesRaw.length
  const activeVehicles = vehiclesRaw.filter((v) => v.is_active).length
  const insuranceExpiring = vehiclesRaw.filter((v) => {
    if (!v.insurance_expiry) return false
    const expiry = new Date(v.insurance_expiry)
    return expiry > now && expiry <= thirtyDaysFromNow
  }).length
  const serviceOverdue = vehiclesRaw.filter((v) => {
    if (!v.next_service_due) return false
    return new Date(v.next_service_due) < now
  }).length

  // Map to serializable rows
  const vehicles: VehicleRow[] = vehiclesRaw.map((v) => ({
    id: v.id,
    name: v.name || v.vehicle_number || `Vehicle #${v.id}`,
    vehicle_number: v.vehicle_number,
    make: v.make,
    model: v.model,
    year: v.year,
    license_plate: v.license_plate,
    status: v.status || 'active',
    is_active: v.is_active ?? true,
    current_mileage: v.current_mileage,
    capacity: v.capacity,
    insurance_expiry: v.insurance_expiry ? v.insurance_expiry.toISOString().split('T')[0] : null,
    registration_expiry: v.registration_expiry ? v.registration_expiry.toISOString().split('T')[0] : null,
    next_service_due: v.next_service_due ? v.next_service_due.toISOString().split('T')[0] : null,
  }))

  return (
    <VehiclesList
      vehicles={vehicles}
      stats={{
        totalVehicles,
        activeVehicles,
        insuranceExpiring,
        serviceOverdue,
      }}
    />
  )
}
