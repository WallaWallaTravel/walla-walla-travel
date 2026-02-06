/**
 * Admin Availability Check API
 *
 * POST /api/admin/availability/check
 *
 * Checks availability for a given date/time and returns available
 * vehicles, drivers, and any conflicts or warnings.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { vehicleAvailabilityService } from '@/lib/services/vehicle-availability.service';
import { pool } from '@/lib/db';

const CheckAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(4).max(12),
  partySize: z.number().min(1).max(50),
  brandId: z.number().optional(),
});

interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CheckAvailabilitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date, startTime, durationHours, partySize, brandId } = parsed.data;

    // Calculate end time
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationHours * 60;
    const endHours = Math.floor(totalMinutes / 60);
    const endMins = totalMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

    // Check vehicle availability using existing service
    const availabilityResult = await vehicleAvailabilityService.checkAvailability({
      date,
      startTime,
      durationHours,
      partySize,
      brandId,
    });

    // Get all vehicles to show availability status
    const vehiclesResult = await pool.query<{
      id: number;
      make: string;
      model: string;
      capacity: number;
      vehicle_type: string;
      status: string;
    }>(
      `SELECT id, make, model, capacity, vehicle_type, status
       FROM vehicles
       WHERE status = 'active'
       ORDER BY capacity ASC`
    );

    // Check which vehicles have conflicts
    const vehicleIds = vehiclesResult.rows.map(v => v.id);
    const conflictMap = vehicleIds.length > 0
      ? await vehicleAvailabilityService.checkMultipleVehiclesAvailability(
          vehicleIds,
          date,
          startTime,
          endTime
        )
      : new Map();

    const vehicles = vehiclesResult.rows.map(v => ({
      id: v.id,
      name: `${v.make} ${v.model}`,
      capacity: v.capacity,
      vehicle_type: v.vehicle_type,
      available: (conflictMap.get(v.id)?.length || 0) === 0 && v.capacity >= partySize,
    }));

    // Get available drivers
    const driversResult = await pool.query<Driver>(
      `SELECT id, first_name, last_name, email, phone, status
       FROM drivers
       WHERE status = 'active'
       ORDER BY last_name, first_name`
    );

    // Check driver availability for the date
    const driverAvailability = await pool.query<{ driver_id: number }>(
      `SELECT DISTINCT b.driver_id
       FROM bookings b
       WHERE b.tour_date = $1
       AND b.status NOT IN ('cancelled')
       AND b.driver_id IS NOT NULL
       AND (
         (b.start_time < $3 AND b.end_time > $2)
       )`,
      [date, startTime, endTime]
    );

    const busyDriverIds = new Set(driverAvailability.rows.map(r => r.driver_id));

    const drivers = driversResult.rows.map(d => ({
      id: d.id,
      name: `${d.first_name} ${d.last_name}`,
      email: d.email,
      phone: d.phone || '',
      available: !busyDriverIds.has(d.id),
    }));

    // Build warnings list
    const warnings: string[] = [];

    // Check for high season (May-October)
    const tourDate = new Date(date);
    const month = tourDate.getMonth();
    if (month >= 4 && month <= 9) {
      warnings.push('High season - consider confirming availability with driver');
    }

    // Check for weekend
    const dayOfWeek = tourDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
      warnings.push('Weekend booking - expect higher demand');
    }

    // Check blackout dates
    const blackoutsResult = await pool.query<{ reason: string }>(
      `SELECT reason FROM availability_rules
       WHERE rule_type = 'blackout_date'
       AND is_active = true
       AND blackout_date = $1`,
      [date]
    );

    if (blackoutsResult.rows.length > 0) {
      warnings.push(`Blackout date: ${blackoutsResult.rows[0].reason || 'Date blocked'}`);
    }

    // If party size exceeds single vehicle capacity, note multi-vehicle needed
    const maxSingleVehicleCapacity = Math.max(...vehicles.map(v => v.capacity), 0);
    if (partySize > maxSingleVehicleCapacity) {
      warnings.push(`Party size (${partySize}) exceeds single vehicle capacity. Multiple vehicles required.`);
    }

    return NextResponse.json({
      success: true,
      data: {
        available: availabilityResult.available,
        vehicles,
        drivers,
        conflicts: availabilityResult.conflicts,
        warnings,
      },
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
