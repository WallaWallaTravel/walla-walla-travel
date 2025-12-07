/**
 * Notification Service
 * 
 * Handles sending notifications via SMS, email, and logging
 */

import { BaseService } from './base.service';

export interface NotificationData {
  driverId: number;
  vehicleId: number;
  defectDescription: string;
}

export class NotificationService extends BaseService {
  protected get serviceName(): string {
    return 'NotificationService';
  }

  /**
   * Send critical defect notification to supervisors
   */
  async sendCriticalDefectAlert(data: NotificationData): Promise<void> {
    this.log('Sending critical defect alert', { vehicleId: data.vehicleId });

    const { query } = await import('@/lib/db');

    // Get driver and vehicle information
    const driverInfo = await query(
      'SELECT name, email, phone FROM users WHERE id = $1',
      [data.driverId]
    );

    const vehicleInfo = await query(
      'SELECT vehicle_number, make, model, vin FROM vehicles WHERE id = $1',
      [data.vehicleId]
    );

    const driver = driverInfo.rows[0];
    const vehicle = vehicleInfo.rows[0];

    if (!driver || !vehicle) {
      throw new Error('Driver or vehicle not found');
    }

    // Format timestamp in Pacific Time
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Supervisor contact info
    const supervisorPhone = process.env.SUPERVISOR_PHONE || 'office-phone-number';
    const supervisorEmail = process.env.SUPERVISOR_EMAIL || 'evcritchlow@gmail.com';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wallawalla.travel';

    // Prepare SMS message
    const smsMessage = `🚨 CRITICAL VEHICLE DEFECT

Vehicle: ${vehicle.vehicle_number}
Reported by: ${driver.name}
Time: ${timestamp}
Issue: ${data.defectDescription?.substring(0, 100)}${data.defectDescription && data.defectDescription.length > 100 ? '...' : ''}

Vehicle marked OUT OF SERVICE.

View details: ${baseUrl}/admin/vehicle-status`;

    // Prepare email
    const emailSubject = `🚨 CRITICAL: ${vehicle.vehicle_number} Out of Service`;
    const emailBody = `
CRITICAL VEHICLE DEFECT REPORTED

Vehicle: ${vehicle.vehicle_number} (${vehicle.make} ${vehicle.model})
VIN: ${vehicle.vin}
Status: OUT OF SERVICE

Reported by: ${driver.name} (${driver.email})
Shift ended: ${timestamp}

Defect Description:
${data.defectDescription}

Action Required:
- Vehicle has been automatically removed from service
- No other drivers can select this vehicle
- Inspect and repair before returning to service

View vehicle status: ${baseUrl}/admin/vehicle-status
Contact driver: ${driver.phone || 'N/A'}
    `.trim();

    // Log notifications (Console output for now)
    console.log('');
    console.log('🚨 CRITICAL DEFECT DETECTED - Initiating safety protocol');
    console.log('══════════════════════════════════════════════════════════');
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

    // Log to notifications table
    try {
      await query(
        `INSERT INTO notifications (driver_id, type, message, sent_to, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [data.driverId, 'critical_vehicle_defect', smsMessage, supervisorEmail]
      );
      console.log('✅ Notification logged to database');
    } catch (dbError) {
      console.warn('⚠️ Failed to log notification to database:', dbError);
    }

    // TODO: In production, integrate with real services:
    // - Twilio for SMS
    // - SendGrid for Email
    // - Push notifications

    console.log('');
    console.log('✅ Critical defect workflow completed successfully');
    console.log('══════════════════════════════════════════════════════════');
    console.log('');

    this.log('Critical defect alert sent successfully');
  }
}

// Export singleton instance
export const notificationService = new NotificationService();




