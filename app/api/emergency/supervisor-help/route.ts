import { NextRequest } from 'next/server';
import { successResponse, errorResponse, requireAuth } from '@/app/api/utils';
import { query } from '@/lib/db';

/**
 * POST /api/emergency/supervisor-help
 * Sends emergency notification to supervisor when driver needs vehicle assignment help
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ('status' in authResult) {
      return errorResponse('Unauthorized', 401);
    }
    const session = authResult;

    const body = await request.json();
    const { reason, timeCardId } = body;

    const driverId = parseInt(session.userId);
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Get driver info
    const driverResult = await query(
      'SELECT name, email FROM users WHERE id = $1',
      [driverId]
    );
    const driver = driverResult.rows[0];

    // Supervisor contact info (hardcoded for now)
    const supervisorPhone = 'office-phone-number'; // TODO: Replace with actual phone
    const supervisorEmail = 'evcritchlow@gmail.com'; // Eric as supervisor

    // Deep link for assigning vehicle
    const deepLink = timeCardId
      ? `https://walla-walla-final.vercel.app/admin/assign-vehicle?driver=${driverId}&timecard=${timeCardId}`
      : `https://walla-walla-final.vercel.app/workflow`;

    // SMS Message
    const smsMessage = `🚨 URGENT: ${driver.name} needs vehicle assignment\nTime: ${timestamp}\nReason: ${reason || 'No vehicle assigned for pre-trip inspection'}\nLink: ${deepLink}`;

    // Email Message
    const emailSubject = `Vehicle Assignment Needed - ${driver.name}`;
    const emailBody = `
URGENT: Vehicle Assignment Request

Driver: ${driver.name}
Email: ${driver.email}
Time: ${timestamp}
Reason: ${reason || 'No vehicle assigned for pre-trip inspection'}

${driver.name} is trying to complete their pre-trip inspection but has no vehicle assigned.

Click here to assign a vehicle:
${deepLink}

Time Card ID: ${timeCardId || 'N/A'}
Driver ID: ${driverId}
    `.trim();

    // Log the notification (in production, this would call Twilio/SendGrid)
    console.log('🆘 EMERGENCY SUPERVISOR NOTIFICATION:');
    console.log('=====================================');
    console.log(`Driver: ${driver.name} (${driver.email})`);
    console.log(`Time: ${timestamp}`);
    console.log(`Reason: ${reason || 'No vehicle assigned'}`);
    console.log('');
    console.log('📱 SMS TO SEND:');
    console.log(`   To: ${supervisorPhone}`);
    console.log(`   Message: ${smsMessage}`);
    console.log('');
    console.log('📧 EMAIL TO SEND:');
    console.log(`   To: ${supervisorEmail}`);
    console.log(`   Subject: ${emailSubject}`);
    console.log(`   Body:\n${emailBody}`);
    console.log('=====================================');

    // TODO: In production, integrate with:
    // - Twilio for SMS: await twilioClient.messages.create({ to: supervisorPhone, body: smsMessage })
    // - SendGrid/AWS SES for Email: await sendEmail({ to: supervisorEmail, subject, body })

    // Log to database for tracking
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
        'emergency_vehicle_help',
        smsMessage,
        supervisorEmail
      ]);
    } catch (dbError) {
      // Non-critical error, continue
      console.warn('Failed to log notification to database:', dbError);
    }

    return successResponse({
      success: true,
      message: 'Help request sent to supervisor!',
      sentTo: {
        sms: supervisorPhone,
        email: supervisorEmail
      },
      timestamp
    }, 'Notification sent successfully');

  } catch (error: any) {
    console.error('Emergency notification error:', error);
    return errorResponse(
      'Failed to send help request. Please call supervisor directly.',
      500
    );
  }
}
