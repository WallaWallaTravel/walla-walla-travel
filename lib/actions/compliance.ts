'use server'

import { prisma } from '@/lib/prisma'

export interface DriverInspection {
  id: number
  vehicle_id: number | null
  type: string | null
  status: string | null
  defects_found: boolean | null
  defect_severity: string | null
  start_mileage: number | null
  end_mileage: number | null
  created_at: Date | null
}

export async function getDriverInspections(driverId: number, limit = 5): Promise<DriverInspection[]> {
  return prisma.$queryRaw<DriverInspection[]>`
    SELECT id, vehicle_id, type, status, defects_found, defect_severity,
           start_mileage, end_mileage, created_at
    FROM inspections
    WHERE driver_id = ${driverId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
}

export interface VehicleInspection {
  id: number
  driver_id: number | null
  type: string | null
  status: string | null
  defects_found: boolean | null
  defect_severity: string | null
  start_mileage: number | null
  end_mileage: number | null
  created_at: Date | null
  driver_name: string | null
}

export async function getVehicleInspections(vehicleId: number, limit = 10): Promise<VehicleInspection[]> {
  return prisma.$queryRaw<VehicleInspection[]>`
    SELECT i.id, i.driver_id, i.type, i.status, i.defects_found, i.defect_severity,
           i.start_mileage, i.end_mileage, i.created_at,
           u.name as driver_name
    FROM inspections i
    LEFT JOIN users u ON i.driver_id = u.id
    WHERE i.vehicle_id = ${vehicleId}
    ORDER BY i.created_at DESC
    LIMIT ${limit}
  `
}

export async function getDriverInspectionCount(driverId: number): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM inspections WHERE driver_id = ${driverId}
  `
  return Number(result[0]?.count ?? 0)
}
