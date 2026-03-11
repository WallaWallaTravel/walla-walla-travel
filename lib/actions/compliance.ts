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

export async function getDriverInspectionCount(driverId: number): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM inspections WHERE driver_id = ${driverId}
  `
  return Number(result[0]?.count ?? 0)
}
