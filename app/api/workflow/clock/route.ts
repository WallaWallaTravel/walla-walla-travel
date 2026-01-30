import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  requireAuth,
  formatDateForDB
} from '@/app/api/utils';
import { query } from '@/lib/db';
import { logger, logApiRequest, logError } from '@/lib/logger';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';

// Request body schema
const ClockRequestSchema = z.object({
  action: z.enum(['clock_in', 'clock_out']),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  vehicleId: z.number().int().positive().optional(),
  startMileage: z.number().int().nonnegative().optional(),
  endMileage: z.number().int().nonnegative().optional(),
  signature: z.string().max(5000).optional(),
  forceClockOut: z.boolean().optional(), // For admin override
});

type ClockRequest = z.infer<typeof ClockRequestSchema>;

interface _TimeCard {
  id: number;
  driver_id: number;
  vehicle_id: number | null;
  date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  vehicle_number?: string;
  make?: string;
  model?: string;
  on_duty_hours?: number;
  status?: string;
}

// Helper function to format time for display
function formatTime(date: Date): string {
  // Convert to Pacific Time for display
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles' // Always display in Pacific Time for consistency
  });
}

// Helper function to format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Check authentication
  const authResult = await requireAuth();
  if ('status' in authResult) {
    return errorResponse('Please log in to access time clock features', 401);
  }
  const session = authResult;

  // Parse and validate request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse('Invalid JSON in request body', 400);
  }

  const parseResult = ClockRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    logger.warn('Clock request validation failed', {
      userId: session.userId,
      errors: parseResult.error.issues,
    });
    return errorResponse('Validation failed: ' + parseResult.error.issues.map((e) => e.message).join(', '), 400);
  }

  const body = parseResult.data;

  // Log the API request with the new logger
  logApiRequest('POST', '/api/workflow/clock', session.userId, body);

  logger.debug('Clock request received', {
    userId: session.userId,
    action: body.action,
    vehicleId: body.vehicleId,
  });

  const driverId = parseInt(session.userId);
  const today = formatDateForDB(new Date());
  const now = new Date();

  // ==================== CLOCK IN ====================
  if (body.action === 'clock_in') {
    logger.debug('Processing CLOCK IN', { driverId });

    // 1. Check for ACTIVE time card only (not clocked out)
    const activeTimeCard = await query(`
      SELECT
        tc.*,
        v.vehicle_number,
        v.make,
        v.model
      FROM time_cards tc
      LEFT JOIN vehicles v ON tc.vehicle_id = v.id
      WHERE tc.driver_id = $1
        AND tc.clock_out_time IS NULL
      ORDER BY tc.clock_in_time DESC
      LIMIT 1
    `, [driverId]);

    if ((activeTimeCard.rowCount ?? 0) > 0) {
      const card = activeTimeCard.rows[0];
      const clockInTime = new Date(card.clock_in_time);

      // Already clocked in and not clocked out
      return successResponse({
        status: 'already_clocked_in',
        timeCard: card,
        message: `You're already clocked in as of ${formatTime(clockInTime)}`,
        vehicle: card.vehicle_number ? `${card.make} ${card.model} (${card.vehicle_number})` : 'Unknown vehicle',
        suggestions: [
          'If you need to clock out, use the Clock Out button',
          'If this is an error, contact your supervisor'
        ]
      }, 'Already clocked in');
    }

    // 2. Check for incomplete time cards from previous days
    const incompletePrevious = await query(`
      SELECT
        tc.*,
        v.vehicle_number,
        v.make,
        v.model
      FROM time_cards tc
      LEFT JOIN vehicles v ON tc.vehicle_id = v.id
      WHERE tc.driver_id = $1
        AND tc.date < $2
        AND tc.clock_out_time IS NULL
      ORDER BY tc.date DESC
      LIMIT 1
    `, [driverId, today]);

    if ((incompletePrevious.rowCount ?? 0) > 0) {
      const card = incompletePrevious.rows[0];
      const cardDate = new Date(card.date);

      // Auto-close old time card if it's from yesterday or before
      if (body.forceClockOut || (now.getTime() - cardDate.getTime()) > 86400000) {
        const endOfDay = new Date(card.date);
        endOfDay.setHours(23, 59, 59, 999);

        await query(`
          UPDATE time_cards
          SET
            clock_out_time = $2,
            on_duty_hours = EXTRACT(EPOCH FROM ($2 - clock_in_time))/3600,
            driver_signature = $3,
            signature_timestamp = $2,
            status = 'auto_closed',
            notes = 'Auto-closed by system - incomplete time card',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [card.id, endOfDay, 'SYSTEM_AUTO_CLOSE']);

        logger.info('Auto-closed incomplete time card', { timeCardId: card.id, date: formatDate(cardDate) });
      } else {
        return successResponse({
          status: 'incomplete_previous',
          previousCard: card,
          message: `You have an incomplete time card from ${formatDate(cardDate)}`,
          suggestions: [
            'Please clock out from your previous shift first',
            'Or contact your supervisor to close the previous time card'
          ]
        }, 'Incomplete previous time card');
      }
    }

    // 3. Check vehicle selection (allow null for non-driving shifts)
    logger.debug('Clock-in request vehicle check', { driverId, vehicleId: body.vehicleId || 'NONE (non-driving shift)' });

    // Allow null vehicleId for non-driving tasks (office work, loading, etc.)
    if (!body.vehicleId) {
      logger.debug('Non-driving shift - no vehicle required', { driverId });

      // Create time card without vehicle (non-driving shift)
      const workLocation = body.location
        ? `Lat: ${body.location.latitude.toFixed(4)}, Lng: ${body.location.longitude.toFixed(4)}`
        : 'Location not provided';

      const result = await query(`
        INSERT INTO time_cards (
          driver_id,
          vehicle_id,
          date,
          work_reporting_location,
          work_reporting_lat,
          work_reporting_lng,
          clock_in_time,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 'on_duty', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        driverId,
        null, // No vehicle for non-driving shift
        today,
        workLocation,
        body.location?.latitude || null,
        body.location?.longitude || null
      ]);

      logger.info('Driver clocked in for non-driving shift', {
        driverId,
        timeCardId: result.rows[0].id,
        clockInTime: result.rows[0].clock_in_time,
      });

      return successResponse({
        status: 'success',
        timeCard: result.rows[0],
        vehicle: null,
        message: `Successfully clocked in for non-driving shift at ${formatTime(now)}`,
        reminders: [
          'Non-driving shift - No vehicle inspections required',
          'Complete your assigned tasks safely'
        ]
      }, 'Successfully clocked in (non-driving)');
    }

    // 4. Verify vehicle exists and is available
    const vehicleCheck = await query(`
      SELECT
        id,
        vehicle_number,
        make,
        model,
        is_active,
        status
      FROM vehicles
      WHERE id = $1
    `, [body.vehicleId]);

    if (vehicleCheck.rowCount === 0) {
      return successResponse({
        status: 'invalid_vehicle',
        message: 'Selected vehicle not found',
        suggestions: [
          'Please select a valid vehicle from the list',
          'Contact dispatch if you need help'
        ]
      }, 'Invalid vehicle');
    }

    const vehicle = vehicleCheck.rows[0];

    if (!vehicle.is_active) {
      return successResponse({
        status: 'vehicle_inactive',
        message: `Vehicle ${vehicle.vehicle_number} is not currently active`,
        suggestions: [
          'This vehicle may be in maintenance',
          'Please select a different vehicle',
          'Contact dispatch for assistance'
        ]
      }, 'Vehicle inactive');
    }

    // Check if vehicle is already in use by another driver
    const vehicleInUse = await query(`
      SELECT
        tc.id,
        tc.driver_id,
        u.name as driver_name,
        tc.clock_in_time
      FROM time_cards tc
      JOIN users u ON tc.driver_id = u.id
      WHERE tc.vehicle_id = $1
        AND tc.clock_out_time IS NULL
        AND tc.driver_id != $2
      LIMIT 1
    `, [body.vehicleId, driverId]);

    if ((vehicleInUse.rowCount ?? 0) > 0) {
      const inUseInfo = vehicleInUse.rows[0];
      return successResponse({
        status: 'vehicle_in_use',
        message: `Vehicle ${vehicle.vehicle_number} is currently in use by ${inUseInfo.driver_name}`,
        suggestions: [
          'Please select a different available vehicle',
          'Contact dispatch if you need this specific vehicle'
        ]
      }, 'Vehicle already in use');
    }

    // 5. Create new time card
    const workLocation = body.location
      ? `Lat: ${body.location.latitude.toFixed(4)}, Lng: ${body.location.longitude.toFixed(4)}`
      : 'Location not provided';

    logger.debug('Preparing to insert time card', {
      driverId,
      vehicleId: body.vehicleId,
      date: today,
      workLocation,
      latitude: body.location?.latitude || null,
      longitude: body.location?.longitude || null,
    });

    const result = await query(`
      INSERT INTO time_cards (
        driver_id,
        vehicle_id,
        date,
        work_reporting_location,
        work_reporting_lat,
        work_reporting_lng,
        clock_in_time,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 'on_duty', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      driverId,
      body.vehicleId,
      today,
      workLocation,
      body.location?.latitude || null,
      body.location?.longitude || null
    ]);

    logger.info('Driver clocked in successfully', {
      driverId,
      timeCardId: result.rows[0].id,
      vehicleId: result.rows[0].vehicle_id,
      clockInTime: result.rows[0].clock_in_time,
    });

    return successResponse({
      status: 'success',
      timeCard: result.rows[0],
      vehicle: `${vehicle.make} ${vehicle.model} (${vehicle.vehicle_number})`,
      message: `Successfully clocked in at ${formatTime(now)}`,
      reminders: [
        'Remember to complete your pre-trip inspection',
        'Drive safely and follow all regulations'
      ]
    }, 'Successfully clocked in');

  }
  // ==================== CLOCK OUT ====================
  else {

    // 1. Find active time card (any day, not clocked out)
    const activeTimeCard = await query(`
      SELECT
        tc.*,
        v.vehicle_number,
        v.make,
        v.model
      FROM time_cards tc
      LEFT JOIN vehicles v ON tc.vehicle_id = v.id
      WHERE tc.driver_id = $1
        AND tc.clock_out_time IS NULL
      ORDER BY tc.clock_in_time DESC
      LIMIT 1
    `, [driverId]);

    if (activeTimeCard.rowCount === 0) {
      // No active time card - can clock in
      return successResponse({
        status: 'not_clocked_in',
        message: "You're not currently clocked in",
        suggestions: [
          'You need to clock in before you can clock out',
          'Use the Clock In button to start your shift'
        ]
      }, 'Not clocked in');
    }

    // 2. Check for required signature
    if (!body.signature || body.signature.trim().length === 0) {
      return successResponse({
        status: 'signature_required',
        message: 'Your signature is required to clock out',
        suggestions: [
          'Please provide your digital signature',
          'This confirms your hours and compliance'
        ]
      }, 'Signature required');
    }

    // 3. Check for post-trip inspection (ONLY required if vehicle was used)
    const timeCard = activeTimeCard.rows[0];
    const timeCardId = timeCard.id;
    const vehicleId = timeCard.vehicle_id;

    // EDGE CASE: If no vehicle assigned (non-driving tasks), skip post-trip requirement
    const warnings: string[] = [];

    if (vehicleId) {
      // Vehicle was used - post-trip inspection REQUIRED
      const inspectionCheck = await query(`
        SELECT id, type, status
        FROM inspections
        WHERE time_card_id = $1
          AND type = 'post_trip'
        LIMIT 1
      `, [timeCardId]);

      if ((inspectionCheck.rowCount ?? 0) === 0) {
        // BLOCK clock-out if post-trip not completed for THIS shift with vehicle
        const vehicleName = timeCard.vehicle_number
          ? `${timeCard.make} ${timeCard.model} (${timeCard.vehicle_number})`
          : 'the vehicle';

        return successResponse({
          status: 'post_trip_required',
          message: `Post-Trip Inspection required for ${vehicleName}`,
          suggestions: [
            'Complete your Post-Trip Inspection first',
            'This ensures vehicle safety for the next driver',
            'Go to Dashboard → Post-Trip Inspection & DVIR'
          ]
        }, 'Post-trip inspection required');
      }
    } else {
      // No vehicle assigned - non-driving shift (office work, loading, etc.)
      logger.debug('Clock-out allowed without post-trip - no vehicle assigned', { timeCardId });
    }

    const clockInTime = new Date(timeCard.clock_in_time);

    // 4. Calculate total hours using database function for absolute time
    const clockOutTime = new Date();
    const hoursResult = await query(`
      SELECT calculate_hos_hours($1::timestamptz, $2::timestamptz) as total_hours
    `, [timeCard.clock_in_time, clockOutTime]);

    const totalHours = parseFloat(hoursResult.rows[0].total_hours) || 0;

    // 5. Check for HOS violations (FMCSA regulations for passenger carriers)
    const hosWarnings = [];
    if (totalHours > 15) {
      hosWarnings.push(`Warning: ${totalHours.toFixed(2)} hours on duty exceeds 15-hour limit`);
    }

    // Check 8-day rolling hours (FMCSA requirement for passenger carriers)
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 7); // 7 days ago = 8-day window including today

    const weeklyHours = await query(`
      SELECT COALESCE(SUM(on_duty_hours), 0) as total_hours
      FROM time_cards
      WHERE driver_id = $1
        AND clock_in_time >= $2::timestamptz
        AND status = 'completed'
    `, [driverId, eightDaysAgo.toISOString()]);

    const currentWeekHours = (weeklyHours.rows[0]?.total_hours || 0) + totalHours;
    if (currentWeekHours > 70) {
      hosWarnings.push(`Warning: ${currentWeekHours.toFixed(2)} weekly hours exceeds 70-hour limit`);
    }

    // 6. Update time card
    const result = await query(`
      UPDATE time_cards
      SET
        clock_out_time = CURRENT_TIMESTAMP,
        on_duty_hours = $2,
        driver_signature = $3,
        signature_timestamp = CURRENT_TIMESTAMP,
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      timeCard.id,
      totalHours,
      body.signature.trim()
    ]);

    logger.info('Driver clocked out', { driverId, totalHours: totalHours.toFixed(2) });

    // 7. Update weekly HOS
    try {
      await query(`
        INSERT INTO weekly_hos (driver_id, week_start_date, total_on_duty_hours, created_at, updated_at)
        VALUES ($1, date_trunc('week', CURRENT_DATE)::date, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (driver_id, week_start_date)
        DO UPDATE SET
          total_on_duty_hours = COALESCE(weekly_hos.total_on_duty_hours, 0) + $2,
          updated_at = CURRENT_TIMESTAMP
      `, [driverId, totalHours]);
    } catch (e) {
      logger.error('Failed to update weekly HOS', { error: e });
    }

    return successResponse({
      status: 'success',
      timeCard: result.rows[0],
      message: `Successfully clocked out at ${formatTime(clockOutTime)}`,
      summary: {
        clockIn: formatTime(clockInTime),
        clockOut: formatTime(clockOutTime),
        totalHours: totalHours.toFixed(2),
        vehicle: `${timeCard.make} ${timeCard.model} (${timeCard.vehicle_number})`
      },
      warnings: [...warnings, ...hosWarnings],
      reminders: [
        'Thank you for your service today',
        'Drive safely on your way home'
      ]
    }, 'Successfully clocked out');
  }
});

// GET endpoint to check current clock status
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const authResult = await requireAuth();
  if ('status' in authResult) {
    return errorResponse('Please log in to check clock status', 401);
  }
  const session = authResult;

  // Log the API request
  logApiRequest('GET', '/api/workflow/clock', session.userId);

  const driverId = parseInt(session.userId);
  const _today = formatDateForDB(new Date());

  // Get current status (check for any active time card, not just today)
  const currentStatus = await query(`
    SELECT
      tc.*,
      v.vehicle_number,
      v.make,
      v.model,
      u.name as driver_name
    FROM time_cards tc
    LEFT JOIN vehicles v ON tc.vehicle_id = v.id
    LEFT JOIN users u ON tc.driver_id = u.id
    WHERE tc.driver_id = $1
      AND tc.clock_out_time IS NULL
    ORDER BY tc.clock_in_time DESC
    LIMIT 1
  `, [driverId]);

  if (currentStatus.rowCount === 0) {
    // Check for completed shifts today
    const todayShifts = await query(`
      SELECT
        tc.*,
        v.vehicle_number,
        v.make,
        v.model
      FROM time_cards tc
      LEFT JOIN vehicles v ON tc.vehicle_id = v.id
      WHERE tc.driver_id = $1
        AND DATE(tc.clock_in_time AT TIME ZONE 'America/Los_Angeles') = DATE(NOW() AT TIME ZONE 'America/Los_Angeles')
        AND tc.clock_out_time IS NOT NULL
      ORDER BY tc.clock_out_time DESC
      LIMIT 1
    `, [driverId]);

    if ((todayShifts.rowCount ?? 0) > 0) {
      const lastShift = todayShifts.rows[0];
      return successResponse({
        status: 'not_clocked_in',
        message: 'Ready to start your next shift',
        canClockIn: true,
        canClockOut: false,
        lastShift: {
          clockIn: formatTime(new Date(lastShift.clock_in_time)),
          clockOut: formatTime(new Date(lastShift.clock_out_time)),
          totalHours: parseFloat(lastShift.on_duty_hours || '0').toFixed(2),
          vehicle: `${lastShift.make} ${lastShift.model} (${lastShift.vehicle_number})`
        }
      }, 'No active time card, last shift completed');
    }

    return successResponse({
      status: 'not_clocked_in',
      message: 'Ready to start your shift',
      canClockIn: true,
      canClockOut: false
    }, 'No active time card');
  }

  const timeCard = currentStatus.rows[0];
  const isClocked = !timeCard.clock_out_time;

  if (isClocked) {
    const clockInTime = new Date(timeCard.clock_in_time);
    const now = new Date();
    const timeDiff = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60); // hours

    // Calculate hours worked using database function for accuracy
    const hoursResult = await query(`
      SELECT calculate_hos_hours($1::timestamptz, NOW()) as hours_worked
    `, [timeCard.clock_in_time]);

    const hoursWorked = parseFloat(hoursResult.rows[0].hours_worked) || 0;

    // Debug logging for troubleshooting
    logger.debug('Clock status calculation', {
      clockInTime: clockInTime.toISOString(),
      now: now.toISOString(),
      timeDiff: timeDiff.toFixed(2),
      hoursWorked: hoursWorked
    });

    return successResponse({
      status: 'clocked_in',
      message: `Clocked in since ${formatTime(clockInTime)}`,
      timeCard,
      vehicle: `${timeCard.make} ${timeCard.model} (${timeCard.vehicle_number})`,
      hoursWorked: hoursWorked.toFixed(2),
      canClockIn: false,
      canClockOut: true
    }, 'Currently clocked in');
  } else {
    const clockOutTime = new Date(timeCard.clock_out_time);

    return successResponse({
      status: 'clocked_out',
      message: `Last clocked out at ${formatTime(clockOutTime)}`,
      lastShift: {
        clockIn: formatTime(new Date(timeCard.clock_in_time)),
        clockOut: formatTime(clockOutTime),
        totalHours: Math.max(0, parseFloat(timeCard.on_duty_hours || '0')).toFixed(2),
        vehicle: `${timeCard.make} ${timeCard.model} (${timeCard.vehicle_number})`
      },
      canClockIn: true,
      canClockOut: false
    }, 'Not currently clocked in');
  }
});
