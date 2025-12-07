/**
 * SMS Service
 * Handles SMS notifications using Twilio
 * https://www.twilio.com/docs/sms
 */

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
 * Assumes US numbers if no country code provided
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it's 10 digits, assume US and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it's 11 digits starting with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it already has a +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Otherwise, return with + prefix
  return `+${cleaned}`;
}

/**
 * Send an SMS using Twilio API
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('⚠️  Twilio not configured. SMS would be sent:', options.message);
    console.log('   To:', options.to);
    return { success: false, error: 'Twilio not configured' };
  }

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
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ SMS send failed:', data);
      return { success: false, error: data.message || 'Failed to send SMS' };
    }

    console.log('✅ SMS sent via Twilio:', data.sid);
    return { success: true, messageId: data.sid };

  } catch (error) {
    console.error('❌ SMS send error:', error);
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
  
  return sendSMS({ to: data.customer_phone, message });
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
  
  return sendSMS({ to: data.driver_phone, message });
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
  
  return sendSMS({ to: data.phone, message });
}

