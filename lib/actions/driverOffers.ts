'use server'

import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { respondToOffer } from '@/lib/actions/driver'
import type { DriverActionResult } from '@/lib/actions/driver'

interface TourOffer {
  id: number
  booking_id: number
  driver_id: number
  vehicle_id: number | null
  offered_at: string
  expires_at: string | null
  status: string
  notes: string | null
  booking_number: string
  customer_name: string
  tour_date: string
  start_time: string
  end_time: string | null
  party_size: number
  pickup_location: string | null
  estimated_hours: string | null
  hourly_rate: string | null
  total_pay: string | null
  vehicle_name: string | null
}

export async function getOffersForDriver(): Promise<{ success: boolean; offers?: TourOffer[]; error?: string }> {
  const session = await getSession()
  if (!session || session.user.role !== 'driver') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const offers = await prisma.$queryRawUnsafe<TourOffer[]>(`
      SELECT
        tof.id, tof.booking_id, tof.driver_id, tof.vehicle_id,
        tof.offered_at, tof.expires_at, tof.status, tof.notes,
        b.booking_number, b.customer_name, b.tour_date, b.start_time, b.end_time,
        b.party_size, b.pickup_location, b.estimated_hours, b.hourly_rate,
        (CASE WHEN b.estimated_hours IS NOT NULL AND b.hourly_rate IS NOT NULL
              THEN b.estimated_hours * b.hourly_rate ELSE NULL END) as total_pay,
        CONCAT(v.make, ' ', v.model) as vehicle_name
      FROM tour_offers tof
      JOIN bookings b ON tof.booking_id = b.id
      LEFT JOIN vehicles v ON tof.vehicle_id = v.id
      WHERE tof.driver_id = $1
        AND (tof.status = 'pending' OR tof.response_at > NOW() - INTERVAL '7 days')
      ORDER BY
        CASE tof.status WHEN 'pending' THEN 1 ELSE 2 END,
        tof.offered_at DESC
    `, session.user.id)

    return { success: true, offers }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load offers'
    return { success: false, error: message }
  }
}

export async function respondToDriverOffer(
  offerId: number,
  action: 'accept' | 'decline',
  notes?: string
): Promise<DriverActionResult> {
  return respondToOffer({ offer_id: offerId, response: action, notes: notes ?? undefined })
}
