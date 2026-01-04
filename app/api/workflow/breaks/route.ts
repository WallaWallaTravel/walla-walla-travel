import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import {
  successResponse,
  errorResponse,
  requireAuth,
  parseRequestBody,
  validateRequiredFields,
  logApiRequest,
  formatDateForDB
} from '@/app/api/utils';
import { query } from '@/lib/db';

interface BreakRequest {
  action: 'start' | 'end';
  type?: 'rest' | 'meal' | 'personal';
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

    logApiRequest('POST', '/api/workflow/breaks', session.userId);

    // Parse request body
    const body = await parseRequestBody<BreakRequest>(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }

    // Validate action
    if (!body.action || !['start', 'end'].includes(body.action)) {
      return errorResponse('Invalid action. Must be start or end', 400);
    }

    const driverId = parseInt(session.userId);
    const today = formatDateForDB(new Date());

    // Get active time card
    const timeCardResult = await query(`
      SELECT * FROM time_cards 
      WHERE driver_id = $1 
        AND DATE(clock_in_time) = $2 
        AND clock_out_time IS NULL
    `, [driverId, today]);

    if ((timeCardResult.rowCount ?? 0) === 0) {
      return errorResponse('Not clocked in. Please clock in before taking a break.', 400);
    }

    const timeCard = timeCardResult.rows[0];

    if (body.action === 'start') {
      // Check if already on break
      const activeBreak = await query(`
        SELECT * FROM break_records 
        WHERE time_card_id = $1 
          AND break_end IS NULL
      `, [timeCard.id]);

      if ((activeBreak.rowCount ?? 0) > 0) {
        return errorResponse('Already on break. Please end current break first.', 400);
      }

      // Validate break type
      const breakType = body.type || 'rest';
      if (!['rest', 'meal', 'personal'].includes(breakType)) {
        return errorResponse('Invalid break type', 400);
      }

      // Create new break record
      const result = await query(`
        INSERT INTO break_records (
          time_card_id,
          driver_id,
          break_start,
          break_type,
          notes
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
        RETURNING *
      `, [
        timeCard.id,
        driverId,
        breakType,
        body.notes || null,
      ]);

      // Update time card status
      await query(`
        UPDATE time_cards 
        SET status = 'on_break', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [timeCard.id]);

      return successResponse(result.rows[0], 'Break started successfully');

    } else { // end break
      // Find active break
      const activeBreak = await query(`
        SELECT * FROM break_records 
        WHERE time_card_id = $1 
          AND driver_id = $2
          AND break_end IS NULL
      `, [timeCard.id, driverId]);

      if ((activeBreak.rowCount ?? 0) === 0) {
        return errorResponse('No active break found.', 400);
      }

      const breakRecord = activeBreak.rows[0];
      
      // Calculate break duration
      const breakStart = new Date(breakRecord.break_start);
      const breakEnd = new Date();
      const durationMinutes = Math.round((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60));

      // Update break record
      const result = await query(`
        UPDATE break_records 
        SET 
          break_end = CURRENT_TIMESTAMP,
          duration_minutes = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [breakRecord.id, durationMinutes]);

      // Update time card status back to on_duty
      await query(`
        UPDATE time_cards 
        SET status = 'on_duty', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [timeCard.id]);

      // Update total break time on time card
      await query(`
        UPDATE time_cards 
        SET 
          total_break_minutes = COALESCE(total_break_minutes, 0) + $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [timeCard.id, durationMinutes]);

      return successResponse(result.rows[0], 'Break ended successfully');
    }

  } catch (error) {
    logger.error('Break management error', { error });
    return errorResponse('Failed to process break action', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;

    logApiRequest('GET', '/api/workflow/breaks', session.userId);

    const driverId = parseInt(session.userId);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || formatDateForDB(new Date());

    // Get breaks for specified date
    const result = await query(`
      SELECT 
        br.*,
        tc.clock_in_time,
        tc.clock_out_time
      FROM break_records br
      JOIN time_cards tc ON br.time_card_id = tc.id
      WHERE br.driver_id = $1 
        AND DATE(br.break_start) = $2
      ORDER BY br.break_start DESC
    `, [driverId, date]);

    // Calculate summary statistics
    const totalBreaks = result.rows.length;
    const totalBreakTime = result.rows.reduce((sum, br) => {
      return sum + (br.duration_minutes || 0);
    }, 0);

    const activeBreak = result.rows.find(br => !br.break_end) || null;

    return successResponse({
      date,
      breaks: result.rows,
      summary: {
        total_breaks: totalBreaks,
        total_break_time_minutes: totalBreakTime,
        active_break: activeBreak,
        compliant: totalBreakTime >= 30, // Minimum 30-minute break in 8 hours
      }
    }, 'Breaks retrieved successfully');

  } catch (error) {
    logger.error('Get breaks error', { error });
    return errorResponse('Failed to retrieve breaks', 500);
  }
}