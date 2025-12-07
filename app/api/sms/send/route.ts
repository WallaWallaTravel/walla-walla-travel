import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, BadRequestError } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { sendSMS, SMSTemplates, sendTourReminder, sendScheduleChangeAlert } from '@/lib/sms';

/**
 * SMS Send Request Schema
 */
const SendSMSSchema = z.object({
  to: z.string().min(10, 'Phone number is required'),
  message: z.string().min(1, 'Message is required').max(1600, 'Message too long (max 1600 chars)'),
  template: z.enum(['custom', 'tour_reminder', 'schedule_change', 'day_of_reminder']).optional(),
  template_data: z.record(z.string(), z.any()).optional(),
});

/**
 * Tour Reminder Template Schema
 */
const TourReminderSchema = z.object({
  to: z.string().min(10),
  template: z.literal('tour_reminder'),
  template_data: z.object({
    customer_name: z.string(),
    tour_date: z.string(),
    pickup_time: z.string(),
    pickup_location: z.string(),
    driver_name: z.string().optional(),
    driver_phone: z.string().optional(),
  }),
});

/**
 * Schedule Change Template Schema
 */
const ScheduleChangeSchema = z.object({
  to: z.string().min(10),
  template: z.literal('schedule_change'),
  template_data: z.object({
    recipient_name: z.string(),
    change_type: z.enum(['time', 'location', 'cancelled']),
    new_value: z.string().optional(),
    booking_number: z.string(),
  }),
});

/**
 * POST /api/sms/send
 * Send an SMS message
 * 
 * Body:
 * - to: Phone number to send to
 * - message: Message text (for custom template)
 * - template: Optional template name
 * - template_data: Data for the template
 */
export const POST = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  const body = await request.json();
  
  // Handle template-based messages
  if (body.template === 'tour_reminder') {
    const data = TourReminderSchema.parse(body);
    
    const result = await sendTourReminder({
      customer_phone: data.to,
      customer_name: data.template_data.customer_name,
      tour_date: data.template_data.tour_date,
      pickup_time: data.template_data.pickup_time,
      pickup_location: data.template_data.pickup_location,
      driver_name: data.template_data.driver_name,
      driver_phone: data.template_data.driver_phone,
    });
    
    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to send SMS');
    }
    
    return NextResponse.json({
      success: true,
      message_id: result.messageId,
      template: 'tour_reminder',
    });
  }
  
  if (body.template === 'schedule_change') {
    const data = ScheduleChangeSchema.parse(body);
    
    const result = await sendScheduleChangeAlert({
      phone: data.to,
      recipient_name: data.template_data.recipient_name,
      change_type: data.template_data.change_type,
      new_value: data.template_data.new_value,
      booking_number: data.template_data.booking_number,
    });
    
    if (!result.success) {
      throw new BadRequestError(result.error || 'Failed to send SMS');
    }
    
    return NextResponse.json({
      success: true,
      message_id: result.messageId,
      template: 'schedule_change',
    });
  }
  
  // Handle custom messages - parse body directly since we already have it
  const data = SendSMSSchema.parse(body);
  
  // Use custom template wrapper for branding
  const message = body.template === 'custom' || !body.template 
    ? SMSTemplates.custom(data.message)
    : data.message;
  
  const result = await sendSMS({
    to: data.to,
    message,
  });
  
  if (!result.success) {
    throw new BadRequestError(result.error || 'Failed to send SMS');
  }
  
  return NextResponse.json({
    success: true,
    message_id: result.messageId,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/sms/send
 * Get SMS service status and available templates
 */
export const GET = withErrorHandling(async () => {
  const configured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
  
  return NextResponse.json({
    service: 'Twilio SMS',
    configured,
    from_number: configured ? process.env.TWILIO_PHONE_NUMBER : null,
    available_templates: [
      {
        name: 'custom',
        description: 'Custom message with company branding',
        required_fields: ['to', 'message'],
      },
      {
        name: 'tour_reminder',
        description: 'Tour reminder sent day before',
        required_fields: ['to', 'template_data.customer_name', 'template_data.tour_date', 'template_data.pickup_time', 'template_data.pickup_location'],
        optional_fields: ['template_data.driver_name', 'template_data.driver_phone'],
      },
      {
        name: 'schedule_change',
        description: 'Schedule change alert',
        required_fields: ['to', 'template_data.recipient_name', 'template_data.change_type', 'template_data.booking_number'],
        optional_fields: ['template_data.new_value'],
      },
    ],
    max_message_length: 1600,
  });
});

