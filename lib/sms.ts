/**
 * SMS Service
 * Handles SMS notifications using Twilio
 * https://www.twilio.com/docs/sms
 */

import { logger } from '@/lib/logger';
import { crmSyncService } from '@/lib/services/crm-sync.service';
import { toE164 } from '@/lib/utils/phone-utils';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const COMPANY_NAME = 'Walla Walla Travel';

interface SMSOptions {
  to: string;
  message: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format phone number to E.164 format
 * Delegates to phone-utils.ts for consistent formatting
 */
function formatPhoneNumber(phone: string): string {
  return toE164(phone);
}

// Default timeout for SMS API calls (30 seconds)
const SMS_TIMEOUT_MS = 30000;

/**
 * Send an SMS using Twilio API
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    logger.warn('Twilio not configured - SMS not sent', { to: options.to, message: options.message.substring(0, 50) });
    return { success: false, error: 'Twilio not configured' };
  }

  // AbortController for request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SMS_TIMEOUT_MS);

  try {
    const formattedPhone = formatPhoneNumber(options.to);

    // Twilio uses Basic Auth with Account SID and Auth Token
    const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: TWILIO_PHONE_NUMBER,
          Body: options.message,
        }).toString(),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      logger.error('SMS send failed', { error: data });
      return { success: false, error: data.message || 'Failed to send SMS' };
    }

    logger.info('SMS sent via Twilio', { sid: data.sid });
    return { success: true, messageId: data.sid };

  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout-specific error
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('SMS request timeout', { timeout: SMS_TIMEOUT_MS });
      return { success: false, error: 'SMS request timeout' };
    }

    logger.error('SMS send error', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * SMS Templates for common messages
 */
export const SMSTemplates = {
  /**
   * Tour reminder for customer (sent day before)
   */
  tourReminder: (data: {
    customer_name: string;
    tour_date: string;
    pickup_time: string;
    pickup_location: string;
    driver_name?: string;
    driver_phone?: string;
  }) => {
    const dateStr = new Date(data.tour_date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    
    let message = `Hi ${data.customer_name}! 🍷 Reminder: Your wine tour is tomorrow (${dateStr}). Pickup at ${data.pickup_time} from ${data.pickup_location}.`;
    
    if (data.driver_name) {
      message += ` Your driver is ${data.driver_name}.`;
    }
    
    message += ` - ${COMPANY_NAME}`;
    
    return message;
  },

  /**
   * Tour assignment notification for driver
   */
  tourAssignment: (data: {
    driver_name: string;
    customer_name: string;
    tour_date: string;
    pickup_time: string;
    party_size: number;
  }) => {
    const dateStr = new Date(data.tour_date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    
    return `Hi ${data.driver_name}! New tour assigned: ${data.customer_name} (${data.party_size} guests) on ${dateStr} at ${data.pickup_time}. Check your portal for details. - ${COMPANY_NAME}`;
  },

  /**
   * Same-day schedule change alert
   */
  scheduleChange: (data: {
    recipient_name: string;
    change_type: 'time' | 'location' | 'cancelled';
    new_value?: string;
    booking_number: string;
  }) => {
    if (data.change_type === 'cancelled') {
      return `Hi ${data.recipient_name}, important update: Tour ${data.booking_number} has been cancelled. Please contact us for details. - ${COMPANY_NAME}`;
    }
    
    const changeLabel = data.change_type === 'time' ? 'pickup time' : 'pickup location';
    return `Hi ${data.recipient_name}, update for tour ${data.booking_number}: New ${changeLabel}: ${data.new_value}. Contact us with questions. - ${COMPANY_NAME}`;
  },

  /**
   * Day-of tour reminder (morning of tour)
   */
  dayOfReminder: (data: {
    customer_name: string;
    pickup_time: string;
    driver_name: string;
    driver_phone: string;
  }) => {
    return `Good morning ${data.customer_name}! 🍷 Your wine tour is TODAY! ${data.driver_name} will pick you up at ${data.pickup_time}. Driver contact: ${data.driver_phone}. Have a wonderful day! - ${COMPANY_NAME}`;
  },

  /**
   * Driver on the way notification
   */
  driverEnRoute: (data: {
    customer_name: string;
    driver_name: string;
    eta_minutes: number;
  }) => {
    return `Hi ${data.customer_name}! Your driver ${data.driver_name} is on the way and will arrive in approximately ${data.eta_minutes} minutes. - ${COMPANY_NAME}`;
  },

  /**
   * Tour completion / thank you
   */
  tourComplete: (data: {
    customer_name: string;
    invoice_url?: string;
  }) => {
    let message = `Thank you ${data.customer_name}! We hope you enjoyed your Walla Walla wine country experience. 🍷`;
    
    if (data.invoice_url) {
      message += ` Your invoice is ready: ${data.invoice_url}`;
    }
    
    message += ` - ${COMPANY_NAME}`;
    
    return message;
  },

  /**
   * Generic custom message
   */
  custom: (message: string) => {
    return `${message} - ${COMPANY_NAME}`;
  },
};

/**
 * Send tour reminder to customer
 */
export async function sendTourReminder(data: {
  customer_phone: string;
  customer_name: string;
  tour_date: string;
  pickup_time: string;
  pickup_location: string;
  driver_name?: string;
  driver_phone?: string;
}): Promise<SMSResult> {
  const message = SMSTemplates.tourReminder({
    customer_name: data.customer_name,
    tour_date: data.tour_date,
    pickup_time: data.pickup_time,
    pickup_location: data.pickup_location,
    driver_name: data.driver_name,
    driver_phone: data.driver_phone,
  });

  const result = await sendSMS({ to: data.customer_phone, message });

  // Log to CRM if successful
  if (result.success) {
    crmSyncService.logSmsSent({
      customerPhone: data.customer_phone,
      message,
      messageType: 'tour_reminder',
    }).catch(err => {
      logger.warn('SMS: CRM logging failed', { error: err });
    });
  }

  return result;
}

/**
 * Send tour assignment notification to driver
 */
export async function sendTourAssignmentSMS(data: {
  driver_phone: string;
  driver_name: string;
  customer_name: string;
  tour_date: string;
  pickup_time: string;
  party_size: number;
}): Promise<SMSResult> {
  const message = SMSTemplates.tourAssignment({
    driver_name: data.driver_name,
    customer_name: data.customer_name,
    tour_date: data.tour_date,
    pickup_time: data.pickup_time,
    party_size: data.party_size,
  });

  const result = await sendSMS({ to: data.driver_phone, message });

  // Note: Driver SMS not logged to CRM (driver is internal, not customer)
  // If needed, could create a separate internal activity log

  return result;
}

/**
 * Send schedule change alert
 */
export async function sendScheduleChangeAlert(data: {
  phone: string;
  recipient_name: string;
  change_type: 'time' | 'location' | 'cancelled';
  new_value?: string;
  booking_number: string;
}): Promise<SMSResult> {
  const message = SMSTemplates.scheduleChange({
    recipient_name: data.recipient_name,
    change_type: data.change_type,
    new_value: data.new_value,
    booking_number: data.booking_number,
  });

  const result = await sendSMS({ to: data.phone, message });

  // Log to CRM if successful
  if (result.success) {
    crmSyncService.logSmsSent({
      customerPhone: data.phone,
      message,
      messageType: `schedule_change_${data.change_type}`,
    }).catch(err => {
      logger.warn('SMS: CRM logging failed', { error: err });
    });
  }

  return result;
}

/**
 * Send SMS with CRM logging (general-purpose wrapper)
 * Use this for any SMS that should be logged to CRM
 */
export async function sendSMSWithCrmLogging(options: {
  to: string;
  message: string;
  messageType?: string;
  customerId?: number;
}): Promise<SMSResult> {
  const result = await sendSMS({ to: options.to, message: options.message });

  if (result.success) {
    crmSyncService.logSmsSent({
      customerPhone: options.to,
      customerId: options.customerId,
      message: options.message,
      messageType: options.messageType || 'general',
    }).catch(err => {
      logger.warn('SMS: CRM logging failed', { error: err });
    });
  }

  return result;
}

