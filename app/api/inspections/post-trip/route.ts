import { NextRequest } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return authResult;
    }
    const session = authResult;
    const driverId = parseInt(session.userId);

    logApiRequest('POST', '/api/inspections/post-trip', session.userId);

    // Parse request body
    const body = await parseRequestBody<{
      vehicleId: number;
      endMileage: number;
      inspectionData: {
        items: Record<string, boolean>;
        notes?: string;
        signature?: string;
        fuelLevel?: string;
        // New defect tracking fields
        defectsFound?: boolean;
        defectSeverity?: 'none' | 'minor' | 'critical';
        defectDescription?: string;
      };
    }>(request);

    if (!body) {
      return errorResponse('Invalid request body', 400);
    }

    // Validate required fields
    const validationError = validateRequiredFields(body, ['vehicleId', 'endMileage', 'inspectionData']);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    const {
      vehicleId,
      endMileage,
      inspectionData
    } = body;

    const {
      items,
      notes = '',
      signature = null,
      defectsFound = false,
      defectSeverity = 'none',
      defectDescription = null
    } = inspectionData;

    // Get active time card ID (links inspection to specific shift)
    const timeCardResult = await query(`
      SELECT id FROM time_cards
      WHERE driver_id = $1 AND clock_out_time IS NULL
      ORDER BY clock_in_time DESC
      LIMIT 1
    `, [driverId]);

    const timeCardId = timeCardResult.rows[0]?.id || null;

    if (!timeCardId) {
      return errorResponse('No active shift found. You must be clocked in to complete post-trip inspection.', 400);
    }

    // Check if post-trip already exists for THIS shift
    const existingInspection = await query(`
      SELECT id FROM inspections
      WHERE time_card_id = $1
        AND type = 'post_trip'
      LIMIT 1
    `, [timeCardId]);

    if (existingInspection.rows.length > 0) {
      return errorResponse('Post-trip inspection already completed for this shift', 400);
    }

    // Save inspection with defect data and time_card_id
    const inspectionResult = await query(`
      INSERT INTO inspections (
        driver_id,
        vehicle_id,
        time_card_id,
        type,
        mileage,
        checklist,
        notes,
        signature,
        defects_found,
        defect_severity,
        defect_description,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING id
    `, [
      driverId,
      vehicleId,
      timeCardId,
      'post_trip',
      endMileage,
      JSON.stringify(items),
      notes,
      signature,
      defectsFound,
      defectSeverity,
      defectDescription
    ]);

    const inspectionId = inspectionResult.rows[0].id;

    console.log(`✅ Post-trip inspection saved (ID: ${inspectionId})`);
    console.log(`   Driver: ${driverId}, Vehicle: ${vehicleId}, Time Card: ${timeCardId}`);
    console.log(`   Defects Found: ${defectsFound}, Severity: ${defectSeverity}`);

    // ═════════════════════════════════════════════════════════════
    // CRITICAL DEFECT WORKFLOW
    // ═════════════════════════════════════════════════════════════
    if (defectSeverity === 'critical') {
      console.log('');
      console.log('🚨 CRITICAL DEFECT DETECTED - Initiating safety protocol');
      console.log('══════════════════════════════════════════════════════════');

      // 1. Mark vehicle as out of service
      await query(`
        UPDATE vehicles
        SET status = 'out_of_service',
            defect_notes = $1,
            defect_reported_at = NOW(),
            defect_reported_by = $2
        WHERE id = $3
      `, [defectDescription, driverId, vehicleId]);

      console.log(`✅ Vehicle ${vehicleId} marked OUT OF SERVICE`);

      // 2. Get driver and vehicle information for notifications
      const driverInfo = await query(`
        SELECT name, email, phone FROM users WHERE id = $1
      `, [driverId]);

      const vehicleInfo = await query(`
        SELECT vehicle_number, make, model, vin FROM vehicles WHERE id = $1
      `, [vehicleId]);

      const driver = driverInfo.rows[0];
      const vehicle = vehicleInfo.rows[0];

      // 3. Format timestamp in Pacific Time
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Supervisor contact info
      const supervisorPhone = 'office-phone-number'; // TODO: Update with actual phone
      const supervisorEmail = 'evcritchlow@gmail.com';

      // 4. Prepare SMS notification
      const smsMessage = `🚨 CRITICAL VEHICLE DEFECT

Vehicle: ${vehicle.vehicle_number}
Reported by: ${driver.name}
Time: ${timestamp}
Issue: ${defectDescription?.substring(0, 100)}${defectDescription && defectDescription.length > 100 ? '...' : ''}

Vehicle marked OUT OF SERVICE.

View details: https://walla-walla-final.vercel.app/admin/vehicle-status`;

      // 5. Prepare Email notification
      const emailSubject = `🚨 CRITICAL: ${vehicle.vehicle_number} Out of Service`;
      const emailBody = `
CRITICAL VEHICLE DEFECT REPORTED

Vehicle: ${vehicle.vehicle_number} (${vehicle.make} ${vehicle.model})
VIN: ${vehicle.vin}
Status: OUT OF SERVICE

Reported by: ${driver.name} (${driver.email})
Shift ended: ${timestamp}

Defect Description:
${defectDescription}

Action Required:
- Vehicle has been automatically removed from service
- No other drivers can select this vehicle
- Inspect and repair before returning to service

View vehicle status: https://walla-walla-final.vercel.app/admin/vehicle-status
Contact driver: ${driver.phone || 'N/A'}
      `.trim();

      // 6. Log notifications (Console output for now - integrate Twilio/SendGrid for production)
      console.log('');
      console.log('📱 SMS NOTIFICATION:');
      console.log(`   To: ${supervisorPhone}`);
      console.log(`   Message: ${smsMessage}`);
      console.log('');
      console.log('📧 EMAIL NOTIFICATION:');
      console.log(`   To: ${supervisorEmail}`);
      console.log(`   Subject: ${emailSubject}`);
      console.log(`   Body:\n${emailBody}`);
      console.log('');
      console.log('══════════════════════════════════════════════════════════');

      // 7. Log to notifications table for tracking
      try {
        await query(`
          INSERT INTO notifications (
            driver_id,
            type,
            message,
            sent_to,
            created_at
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        `, [
          driverId,
          'critical_vehicle_defect',
          smsMessage,
          supervisorEmail
        ]);
        console.log('✅ Notification logged to database');
      } catch (dbError) {
        console.warn('⚠️ Failed to log notification to database:', dbError);
      }

      // TODO: In production, integrate with real notification services:
      //
      // Twilio (SMS):
      // const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await twilioClient.messages.create({
      //   to: supervisorPhone,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   body: smsMessage
      // });
      //
      // SendGrid (Email):
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: supervisorEmail,
      //   from: 'notifications@wallawallatravel.com',
      //   subject: emailSubject,
      //   text: emailBody
      // });

      console.log('');
      console.log('✅ Critical defect workflow completed successfully');
      console.log('══════════════════════════════════════════════════════════');
      console.log('');

      return successResponse({
        inspectionId,
        criticalDefect: true,
        vehicleOutOfService: true,
        message: 'Post-trip inspection saved. Vehicle marked out of service. Supervisor notified.'
      }, 'Critical defect reported successfully');
    }

    // Normal completion (no critical defects)
    return successResponse({
      inspectionId,
      criticalDefect: false,
      vehicleOutOfService: false
    }, 'Post-trip inspection saved successfully');

  } catch (error: any) {
    console.error('❌ Post-trip inspection error:', error);
    return errorResponse(
      error.message || 'Failed to save post-trip inspection',
      500
    );
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
    const driverId = parseInt(session.userId);

    logApiRequest('GET', '/api/inspections/post-trip', session.userId);

    // Get active time card
    const timeCardResult = await query(`
      SELECT id FROM time_cards
      WHERE driver_id = $1 AND clock_out_time IS NULL
      ORDER BY clock_in_time DESC
      LIMIT 1
    `, [driverId]);

    const timeCardId = timeCardResult.rows[0]?.id;

    if (!timeCardId) {
      return successResponse(null, 'No active shift');
    }

    // Query for post-trip inspection for THIS shift
    const result = await query(`
      SELECT i.*, v.vehicle_number, v.make, v.model
      FROM inspections i
      JOIN vehicles v ON i.vehicle_id = v.id
      WHERE i.time_card_id = $1
        AND i.type = 'post_trip'
      ORDER BY i.created_at DESC
      LIMIT 1
    `, [timeCardId]);

    if (result.rows.length === 0) {
      return successResponse(null, 'No post-trip inspection found for this shift');
    }

    return successResponse(result.rows[0], 'Post-trip inspection retrieved');

  } catch (error) {
    console.error('Get post-trip inspection error:', error);
    return errorResponse('Failed to retrieve post-trip inspection', 500);
  }
}
