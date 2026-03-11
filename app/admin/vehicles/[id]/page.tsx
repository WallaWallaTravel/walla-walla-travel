import { getSession } from '@/lib/auth/session'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getVehicleInspections, type VehicleInspection } from '@/lib/actions/compliance'
import VehicleDetail from './VehicleDetail'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const vehicle = await prisma.vehicles.findFirst({
    where: { id: Number(id) },
    select: { name: true, vehicle_number: true },
  })
  const label = vehicle?.name || vehicle?.vehicle_number || 'Vehicle'
  return {
    title: `${label} | Vehicles | Admin`,
  }
}

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const vehicleId = Number(id)
  if (isNaN(vehicleId)) notFound()

  const vehicle = await prisma.vehicles.findFirst({
    where: { id: vehicleId },
    select: {
      id: true,
      name: true,
      vehicle_number: true,
      make: true,
      model: true,
      year: true,
      color: true,
      vin: true,
      license_plate: true,
      vehicle_type: true,
      capacity: true,
      status: true,
      is_active: true,
      brand_id: true,
      fuel_level: true,
      current_mileage: true,
      last_service_mileage: true,
      next_service_mileage: true,
      last_service_date: true,
      next_service_due: true,
      last_inspection_date: true,
      insurance_expiry: true,
      registration_expiry: true,
      notes: true,
    },
  })

  if (!vehicle) notFound()

  // Fetch related data separately
  const [mileageLogs, alerts, inspections] = await Promise.all([
    prisma.mileage_logs.findMany({
      where: { vehicle_id: vehicleId },
      orderBy: { recorded_date: 'desc' },
      take: 10,
      select: {
        id: true,
        mileage: true,
        previous_mileage: true,
        mileage_change: true,
        recorded_date: true,
        recorded_by: true,
        notes: true,
      },
    }),
    prisma.vehicle_alerts.findMany({
      where: { vehicle_id: vehicleId, resolved_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        alert_type: true,
        severity: true,
        message: true,
        created_at: true,
      },
    }),
    getVehicleInspections(vehicleId, 10),
  ])

  // Get user names for mileage logs
  const recorderIds = [...new Set(
    mileageLogs
      .map((ml) => ml.recorded_by)
      .filter((v): v is number => v !== null)
  )]
  const recorders = recorderIds.length > 0
    ? await prisma.users.findMany({
        where: { id: { in: recorderIds } },
        select: { id: true, name: true },
      })
    : []
  const recorderMap = new Map(recorders.map((u) => [u.id, u.name || 'Unknown']))

  // Calculate mileage until next service
  const mileageUntilService =
    vehicle.next_service_mileage && vehicle.current_mileage
      ? vehicle.next_service_mileage - vehicle.current_mileage
      : null

  // Serialize for client
  const serialized = {
    id: vehicle.id,
    name: vehicle.name || vehicle.vehicle_number || `Vehicle #${vehicle.id}`,
    vehicle_number: vehicle.vehicle_number,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    vin: vehicle.vin,
    license_plate: vehicle.license_plate,
    vehicle_type: vehicle.vehicle_type,
    capacity: vehicle.capacity,
    status: vehicle.status || 'active',
    is_active: vehicle.is_active ?? true,
    brand_id: vehicle.brand_id,
    fuel_level: vehicle.fuel_level,
    current_mileage: vehicle.current_mileage,
    last_service_mileage: vehicle.last_service_mileage,
    next_service_mileage: vehicle.next_service_mileage,
    mileage_until_service: mileageUntilService,
    last_service_date: vehicle.last_service_date?.toISOString().split('T')[0] ?? null,
    next_service_due: vehicle.next_service_due?.toISOString().split('T')[0] ?? null,
    last_inspection_date: vehicle.last_inspection_date?.toISOString().split('T')[0] ?? null,
    insurance_expiry: vehicle.insurance_expiry?.toISOString().split('T')[0] ?? null,
    registration_expiry: vehicle.registration_expiry?.toISOString().split('T')[0] ?? null,
    notes: vehicle.notes,
    mileageLogs: mileageLogs.map((ml) => ({
      id: ml.id,
      mileage: Number(ml.mileage),
      previous_mileage: ml.previous_mileage ? Number(ml.previous_mileage) : null,
      mileage_change: ml.mileage_change ? Number(ml.mileage_change) : null,
      recorded_date: ml.recorded_date.toISOString().split('T')[0],
      recorded_by: ml.recorded_by ? recorderMap.get(ml.recorded_by) ?? null : null,
    })),
    alerts: alerts.map((a) => ({
      id: a.id,
      alert_type: a.alert_type,
      severity: a.severity,
      message: a.message,
      created_at: a.created_at?.toISOString().split('T')[0] ?? null,
    })),
    inspections: inspections.map((i: VehicleInspection) => ({
      id: i.id,
      date: i.created_at ? new Date(i.created_at).toISOString().split('T')[0] : null,
      type: i.type,
      driver_name: i.driver_name,
      status: i.status,
      defects_found: i.defects_found ?? false,
      defect_severity: i.defect_severity,
    })),
  }

  return <VehicleDetail vehicle={serialized} />
}
