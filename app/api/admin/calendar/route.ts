/**
 * Admin Calendar API
 *
 * Returns combined data for the admin calendar:
 * - Bookings for the month with compliance data
 * - Availability blocks (maintenance, blackout, holds)
 * - Vehicle summary
 * - Compliance issues for assigned drivers/vehicles
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { getSessionFromRequest } from '@/lib/auth/session';

// Compliance warning thresholds
const COMPLIANCE_WARNING_DAYS = 40;  // First notice
const COMPLIANCE_URGENT_DAYS = 10;   // Urgent threshold
const COMPLIANCE_CRITICAL_DAYS = 5;  // Critical threshold

export interface ComplianceIssue {
  type: 'driver' | 'vehicle';
  entityId: number;
  entityName: string;
  field: string;
  expiryDate: string;
  daysUntilExpiry: number;
  severity: 'expired' | 'critical' | 'urgent' | 'warning';
  affectedBookings: number[];
}

export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Verify admin access
  const session = await getSessionFromRequest(request);
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

  // Calculate date range for the month (with buffer for calendar display)
  const startDate = new Date(year, month - 1, 1);
  startDate.setDate(startDate.getDate() - 7); // Include previous week
  const endDate = new Date(year, month, 7); // Include first week of next month

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Today for compliance checks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const _todayStr = today.toISOString().split('T')[0];

  // Date 30 days from now for warning threshold
  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + COMPLIANCE_WARNING_DAYS);
  const _warningDateStr = warningDate.toISOString().split('T')[0];

  // Fetch bookings with driver and vehicle compliance data
  const bookingsResult = await query(
    `SELECT
      b.id,
      b.booking_number,
      b.tour_date,
      b.pickup_time as start_time,
      b.party_size,
      b.status,
      b.vehicle_id,
      b.driver_id,
      c.name as customer_name,
      v.name as vehicle_name,
      v.insurance_expiry as vehicle_insurance_expiry,
      v.registration_expiry as vehicle_registration_expiry,
      d.name as driver_name,
      d.license_expiry as driver_license_expiry,
      d.medical_cert_expiry as driver_medical_expiry
     FROM bookings b
     LEFT JOIN customers c ON b.customer_id = c.id
     LEFT JOIN vehicles v ON b.vehicle_id = v.id
     LEFT JOIN users d ON b.driver_id = d.id
     WHERE b.tour_date >= $1 AND b.tour_date <= $2
     ORDER BY b.tour_date, b.pickup_time`,
    [startDateStr, endDateStr]
  );

    // Fetch availability blocks
    const blocksResult = await query(
      `SELECT
        vab.id,
        vab.vehicle_id,
        vab.block_date,
        vab.start_time,
        vab.end_time,
        vab.block_type,
        vab.reason,
        vab.booking_id,
        vab.created_at,
        v.name as vehicle_name
       FROM vehicle_availability_blocks vab
       LEFT JOIN vehicles v ON vab.vehicle_id = v.id
       WHERE vab.block_date >= $1 AND vab.block_date <= $2
       ORDER BY vab.block_date, vab.start_time`,
      [startDateStr, endDateStr]
    );

    // Fetch vehicles for summary
    const vehiclesResult = await query(
      `SELECT id, name, capacity, is_active
       FROM vehicles
       WHERE is_active = true
       ORDER BY name`
    );

    // Fetch drivers (stored in users table with role = 'driver')
    const driversResult = await query(
      `SELECT id, name, role as is_active
       FROM users
       WHERE role = 'driver'
       ORDER BY name`
    );

    // Calculate daily summaries
    const dailySummaries: Record<string, {
      bookings: number;
      blockedVehicles: number;
      availableVehicles: number;
      totalCapacity: number;
      bookedCapacity: number;
    }> = {};

    const totalVehicles = vehiclesResult.rows.length;
    const totalCapacity = vehiclesResult.rows.reduce((sum, v) => sum + (v.capacity || 14), 0);

    // Group bookings by date
    const bookingsByDate: Record<string, typeof bookingsResult.rows> = {};
    for (const booking of bookingsResult.rows) {
      const dateStr = booking.tour_date.toISOString().split('T')[0];
      if (!bookingsByDate[dateStr]) bookingsByDate[dateStr] = [];
      bookingsByDate[dateStr].push(booking);
    }

    // Group blocks by date and vehicle
    const blocksByDate: Record<string, typeof blocksResult.rows> = {};
    for (const block of blocksResult.rows) {
      const dateStr = block.block_date.toISOString().split('T')[0];
      if (!blocksByDate[dateStr]) blocksByDate[dateStr] = [];
      blocksByDate[dateStr].push(block);
    }

    // Calculate summary for each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayBookings = bookingsByDate[dateStr] || [];
      const dayBlocks = blocksByDate[dateStr] || [];

      // Count unique blocked vehicles
      const blockedVehicleIds = new Set(dayBlocks.map(b => b.vehicle_id));
      // Count vehicles with bookings
      const bookedVehicleIds = new Set(dayBookings.map(b => b.vehicle_id).filter(Boolean));

      // Available = total - (blocked ∪ booked) for the day
      const unavailableCount = new Set([...blockedVehicleIds, ...bookedVehicleIds]).size;

      dailySummaries[dateStr] = {
        bookings: dayBookings.length,
        blockedVehicles: blockedVehicleIds.size,
        availableVehicles: Math.max(0, totalVehicles - unavailableCount),
        totalCapacity,
        bookedCapacity: dayBookings.reduce((sum, b) => sum + (b.party_size || 0), 0)
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate compliance issues for bookings
    const complianceIssues: ComplianceIssue[] = [];
    const driverIssuesMap = new Map<number, ComplianceIssue>();
    const vehicleIssuesMap = new Map<number, ComplianceIssue>();

    // Helper to calculate days until expiry and severity
    const getComplianceInfo = (expiryDate: Date | null): { daysUntil: number; severity: 'expired' | 'critical' | 'urgent' | 'warning' } | null => {
      if (!expiryDate) return null;
      const expiry = new Date(expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysUntil <= 0) return { daysUntil, severity: 'expired' };
      if (daysUntil <= COMPLIANCE_CRITICAL_DAYS) return { daysUntil, severity: 'critical' };
      if (daysUntil <= COMPLIANCE_URGENT_DAYS) return { daysUntil, severity: 'urgent' };
      if (daysUntil <= COMPLIANCE_WARNING_DAYS) return { daysUntil, severity: 'warning' };
      return null;
    };

    // Check each booking for compliance issues
    for (const booking of bookingsResult.rows) {
      // Driver license expiry
      if (booking.driver_id && booking.driver_license_expiry) {
        const info = getComplianceInfo(booking.driver_license_expiry);
        if (info) {
          const _key = `driver-${booking.driver_id}-license`;
          if (!driverIssuesMap.has(booking.driver_id)) {
            driverIssuesMap.set(booking.driver_id, {
              type: 'driver',
              entityId: booking.driver_id,
              entityName: booking.driver_name || `Driver ${booking.driver_id}`,
              field: 'license_expiry',
              expiryDate: new Date(booking.driver_license_expiry).toISOString().split('T')[0],
              daysUntilExpiry: info.daysUntil,
              severity: info.severity,
              affectedBookings: [booking.id],
            });
          } else {
            driverIssuesMap.get(booking.driver_id)!.affectedBookings.push(booking.id);
          }
        }
      }

      // Driver medical cert expiry
      if (booking.driver_id && booking.driver_medical_expiry) {
        const info = getComplianceInfo(booking.driver_medical_expiry);
        if (info) {
          const _key = `driver-${booking.driver_id}-medical`;
          const existing = Array.from(driverIssuesMap.values()).find(
            i => i.entityId === booking.driver_id && i.field === 'medical_cert_expiry'
          );
          if (!existing) {
            complianceIssues.push({
              type: 'driver',
              entityId: booking.driver_id,
              entityName: booking.driver_name || `Driver ${booking.driver_id}`,
              field: 'medical_cert_expiry',
              expiryDate: new Date(booking.driver_medical_expiry).toISOString().split('T')[0],
              daysUntilExpiry: info.daysUntil,
              severity: info.severity,
              affectedBookings: [booking.id],
            });
          }
        }
      }

      // Vehicle insurance expiry
      if (booking.vehicle_id && booking.vehicle_insurance_expiry) {
        const info = getComplianceInfo(booking.vehicle_insurance_expiry);
        if (info) {
          if (!vehicleIssuesMap.has(booking.vehicle_id)) {
            vehicleIssuesMap.set(booking.vehicle_id, {
              type: 'vehicle',
              entityId: booking.vehicle_id,
              entityName: booking.vehicle_name || `Vehicle ${booking.vehicle_id}`,
              field: 'insurance_expiry',
              expiryDate: new Date(booking.vehicle_insurance_expiry).toISOString().split('T')[0],
              daysUntilExpiry: info.daysUntil,
              severity: info.severity,
              affectedBookings: [booking.id],
            });
          } else {
            vehicleIssuesMap.get(booking.vehicle_id)!.affectedBookings.push(booking.id);
          }
        }
      }

      // Vehicle registration expiry
      if (booking.vehicle_id && booking.vehicle_registration_expiry) {
        const info = getComplianceInfo(booking.vehicle_registration_expiry);
        if (info) {
          const existing = Array.from(vehicleIssuesMap.values()).find(
            i => i.entityId === booking.vehicle_id && i.field === 'registration_expiry'
          );
          if (!existing) {
            complianceIssues.push({
              type: 'vehicle',
              entityId: booking.vehicle_id,
              entityName: booking.vehicle_name || `Vehicle ${booking.vehicle_id}`,
              field: 'registration_expiry',
              expiryDate: new Date(booking.vehicle_registration_expiry).toISOString().split('T')[0],
              daysUntilExpiry: info.daysUntil,
              severity: info.severity,
              affectedBookings: [booking.id],
            });
          }
        }
      }
    }

    // Combine all issues
    complianceIssues.push(...Array.from(driverIssuesMap.values()));
    complianceIssues.push(...Array.from(vehicleIssuesMap.values()));

    // Sort by severity (expired first, then urgent, then warning)
    const severityOrder: Record<string, number> = { expired: 0, critical: 1, urgent: 2, warning: 3 };
    complianceIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Create a map of booking IDs to their compliance issues
    const bookingComplianceIssues: Record<number, string[]> = {};
    for (const issue of complianceIssues) {
      for (const bookingId of issue.affectedBookings) {
        if (!bookingComplianceIssues[bookingId]) {
          bookingComplianceIssues[bookingId] = [];
        }
        const label = issue.type === 'driver'
          ? `Driver ${issue.field.replace('_expiry', '').replace('_', ' ')} ${issue.severity}`
          : `Vehicle ${issue.field.replace('_expiry', '').replace('_', ' ')} ${issue.severity}`;
        if (!bookingComplianceIssues[bookingId].includes(label)) {
          bookingComplianceIssues[bookingId].push(label);
        }
      }
    }

    return NextResponse.json({
      bookings: bookingsResult.rows.map(b => ({
        id: b.id,
        booking_number: b.booking_number,
        tour_date: b.tour_date.toISOString().split('T')[0],
        start_time: b.start_time,
        party_size: b.party_size,
        status: b.status,
        vehicle_id: b.vehicle_id,
        driver_id: b.driver_id,
        customer_name: b.customer_name,
        vehicle_name: b.vehicle_name,
        driver_name: b.driver_name,
        complianceIssues: bookingComplianceIssues[b.id] || [],
      })),
      blocks: blocksResult.rows.map(b => ({
        ...b,
        block_date: b.block_date.toISOString().split('T')[0]
      })),
      vehicles: vehiclesResult.rows,
      drivers: driversResult.rows,
      dailySummaries,
      complianceIssues,
      meta: {
        year,
        month,
        startDate: startDateStr,
        endDate: endDateStr,
        totalVehicles,
        totalCapacity,
        complianceSummary: {
          expired: complianceIssues.filter(i => i.severity === 'expired').length,
          critical: complianceIssues.filter(i => i.severity === 'critical').length,
          urgent: complianceIssues.filter(i => i.severity === 'urgent').length,
          warning: complianceIssues.filter(i => i.severity === 'warning').length,
        }
      }
  });
});
