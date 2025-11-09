
/**
 * Email Service
 * Handles all email notifications for the system
 * Uses Resend API (https://resend.com)
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@wallawallatravel.com';
const COMPANY_NAME = 'Walla Walla Travel';

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not configured. Email would be sent:', options.subject);
    console.log('   To:', options.to);
    console.log('   Subject:', options.subject);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || FROM_EMAIL,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Email send failed:', error);
      return false;
    }

    const data = await response.json();
    console.log('✅ Email sent:', data.id);
    return true;

  } catch (error) {
    console.error('❌ Email send error:', error);
    return false;
  }
}

/**
 * Email Templates
 */

export const EmailTemplates = {
  /**
   * Booking Confirmation Email
   */
  bookingConfirmation: (data: {
    customer_name: string;
    booking_number: string;
    tour_date: string;
    start_time: string;
    end_time?: string;
    duration_hours: number;
    party_size: number;
    pickup_location: string;
    total_price: number;
    deposit_paid: number;
    balance_due: number;
    wineries?: Array<{ name: string; city: string }>;
  }) => ({
    subject: `🍷 Your Walla Walla Wine Tour is Confirmed! [${data.booking_number}]`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🍷 Tour Confirmed!</h1>
            <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 18px;">Your Walla Walla wine country adventure awaits</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 20px;">
            <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${data.customer_name},</p>
            
            <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
              Thank you for booking with ${COMPANY_NAME}! We're excited to show you the best of Walla Walla wine country. Your tour is confirmed and we can't wait to make it an unforgettable experience.
            </p>
            
            <!-- Booking Details Card -->
            <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
              <h2 style="color: #7c3aed; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">📋 Your Tour Details</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Booking Number:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.booking_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Tour Date:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${new Date(data.tour_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Pickup Time:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.start_time}${data.end_time ? ` - ${data.end_time}` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Duration:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.duration_hours} hours</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Party Size:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.party_size} guest${data.party_size > 1 ? 's' : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Pickup Location:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.pickup_location}</td>
                </tr>
              </table>
            </div>
            
            ${data.wineries && data.wineries.length > 0 ? `
            <!-- Wineries -->
            <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
              <h2 style="color: #92400e; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">🍇 Your Winery Stops</h2>
              ${data.wineries.map((winery, index) => `
                <div style="padding: 8px 0;">
                  <span style="display: inline-block; width: 24px; height: 24px; background: #7c3aed; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold; margin-right: 8px;">${index + 1}</span>
                  <span style="color: #1f2937; font-size: 15px; font-weight: 600;">${winery.name}</span>
                  <span style="color: #6b7280; font-size: 14px;"> • ${winery.city}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}
            
            <!-- Payment Summary -->
            <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
              <h2 style="color: #065f46; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">💳 Payment Summary</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Total Tour Price:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">$${data.total_price.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Deposit Paid:</td>
                  <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: bold; text-align: right;">$${data.deposit_paid.toFixed(2)} ✓</td>
                </tr>
                <tr style="border-top: 2px solid #10b981;">
                  <td style="padding: 12px 0 0 0; color: #065f46; font-size: 16px; font-weight: bold;">Balance Due:</td>
                  <td style="padding: 12px 0 0 0; color: #065f46; font-size: 18px; font-weight: bold; text-align: right;">$${data.balance_due.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 8px 0 0 0; color: #6b7280; font-size: 13px; font-style: italic;">Final payment will be automatically charged 48 hours before your tour.</td>
                </tr>
              </table>
            </div>
            
            <!-- What's Next -->
            <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
              <h2 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">📅 What's Next?</h2>
              
              <ul style="margin: 0; padding: 0 0 0 20px; color: #1f2937;">
                <li style="margin: 0 0 12px 0; line-height: 1.6;">We'll send you a detailed itinerary 7 days before your tour</li>
                <li style="margin: 0 0 12px 0; line-height: 1.6;">Your driver will be assigned and you'll receive their contact info</li>
                <li style="margin: 0 0 12px 0; line-height: 1.6;">You'll receive a reminder 72 hours before your tour</li>
                <li style="margin: 0 0 12px 0; line-height: 1.6;">Final payment will be processed 48 hours before your tour</li>
                <li style="margin: 0; line-height: 1.6;">On tour day, your driver will arrive at your pickup location</li>
              </ul>
            </div>
            
            <!-- Contact Info -->
            <div style="text-align: center; padding: 20px 0; border-top: 2px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">Questions about your tour?</p>
              <p style="margin: 0;">
                <a href="mailto:info@wallawallatravel.com" style="color: #7c3aed; text-decoration: none; font-weight: 600;">info@wallawallatravel.com</a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="tel:+15095550199" style="color: #7c3aed; text-decoration: none; font-weight: 600;">(509) 555-0199</a>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              <strong style="color: #1f2937;">${COMPANY_NAME}</strong><br>
              Walla Walla, Washington
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
🍷 Your Walla Walla Wine Tour is Confirmed!

Hi ${data.customer_name},

Thank you for booking with ${COMPANY_NAME}! Your tour is confirmed.

BOOKING DETAILS:
Booking Number: ${data.booking_number}
Date: ${new Date(data.tour_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
Time: ${data.start_time}${data.end_time ? ` - ${data.end_time}` : ''}
Duration: ${data.duration_hours} hours
Party Size: ${data.party_size} guest${data.party_size > 1 ? 's' : ''}
Pickup: ${data.pickup_location}

${data.wineries && data.wineries.length > 0 ? `
YOUR WINERY STOPS:
${data.wineries.map((w, i) => `${i + 1}. ${w.name} - ${w.city}`).join('\n')}
` : ''}

PAYMENT SUMMARY:
Total: $${data.total_price.toFixed(2)}
Deposit Paid: $${data.deposit_paid.toFixed(2)} ✓
Balance Due: $${data.balance_due.toFixed(2)}
(Final payment will be charged 48 hours before tour)

WHAT'S NEXT:
• Detailed itinerary sent 7 days before tour
• Driver assignment notification
• Reminder 72 hours before tour
• Final payment 48 hours before tour

Questions? Contact us:
Email: info@wallawallatravel.com
Phone: (509) 555-0199

${COMPANY_NAME}
Walla Walla, Washington
    `
  }),

  /**
   * Invoice Email
   */
  invoice: (data: {
    customer_name: string;
    invoice_number: string;
    invoice_type: 'deposit' | 'final';
    amount: number;
    due_date: string;
    payment_url: string;
  }) => ({
    subject: `${data.invoice_type === 'deposit' ? 'Deposit' : 'Final'} Invoice - ${data.invoice_number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">💳 Invoice Ready</h1>
        
        <p>Hi ${data.customer_name},</p>
        
        <p>Your ${data.invoice_type} invoice is ready for payment.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Invoice ${data.invoice_number}</h2>
          <p style="font-size: 32px; font-weight: bold; color: #7c3aed; margin: 10px 0;">
            $${data.amount.toFixed(2)}
          </p>
          <p><strong>Due Date:</strong> ${new Date(data.due_date).toLocaleDateString()}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.payment_url}" style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Pay Invoice
          </a>
        </div>
        
        <p style="font-size: 12px; color: #6b7280;">
          If the button doesn't work, copy and paste this link:<br>
          ${data.payment_url}
        </p>
        
        <p>Thank you for your business!</p>
        
        <p>Best regards,<br>${COMPANY_NAME}</p>
      </div>
    `,
  }),

  /**
   * Final Invoice with Tip Option
   */
  finalInvoice: (data: {
    customer_name: string;
    booking_number: string;
    invoice_number: string;
    tour_date: string;
    actual_hours: number;
    hourly_rate: number;
    subtotal: number;
    driver_name: string;
    payment_url: string;
  }) => ({
    subject: `🍷 Final Invoice - Thank You for Your Tour! [${data.invoice_number}]`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🍷 Thank You!</h1>
            <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 18px;">We hope you had an amazing tour</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 20px;">
            <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hi ${data.customer_name},</p>
            
            <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
              Thank you for choosing ${COMPANY_NAME}! We hope you enjoyed your wine country adventure on ${new Date(data.tour_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Here's your final invoice for the tour.
            </p>
            
            <!-- Invoice Details Card -->
            <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
              <h2 style="color: #7c3aed; margin: 0 0 20px 0; font-size: 20px; font-weight: bold;">📋 Final Invoice</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Invoice Number:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.invoice_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Booking:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.booking_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Tour Date:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${new Date(data.tour_date).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Your Driver:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.driver_name}</td>
                </tr>
              </table>
            </div>
            
            <!-- Service Details -->
            <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
              <h2 style="color: #065f46; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">💰 Service Details</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Service Hours:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${data.actual_hours.toFixed(1)} hours</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Hourly Rate:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">$${data.hourly_rate.toFixed(2)}/hr</td>
                </tr>
                <tr style="border-top: 2px solid #10b981;">
                  <td style="padding: 12px 0 0 0; color: #065f46; font-size: 16px; font-weight: bold;">Amount Due:</td>
                  <td style="padding: 12px 0 0 0; color: #065f46; font-size: 24px; font-weight: bold; text-align: right;">$${data.subtotal.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <!-- Tip Option Callout -->
            <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
              <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">💖 Show Your Appreciation</h3>
              <p style="color: #78350f; margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">
                If ${data.driver_name} provided excellent service, you can add a tip when you pay. Suggested amounts:
              </p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #78350f; font-size: 14px;">15%</td>
                  <td style="padding: 4px 0; color: #78350f; font-size: 14px; text-align: right;">$${(data.subtotal * 0.15).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #78350f; font-size: 14px;">20%</td>
                  <td style="padding: 4px 0; color: #78350f; font-size: 14px; text-align: right; font-weight: bold;">$${(data.subtotal * 0.20).toFixed(2)} ⭐</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #78350f; font-size: 14px;">25%</td>
                  <td style="padding: 4px 0; color: #78350f; font-size: 14px; text-align: right;">$${(data.subtotal * 0.25).toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <!-- Payment Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.payment_url}" style="background: #7c3aed; color: white; padding: 18px 40px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; font-size: 18px;">
                💳 Pay Invoice
              </a>
              <p style="color: #6b7280; font-size: 13px; margin: 15px 0 0 0;">
                You'll be able to add a tip for ${data.driver_name} during checkout
              </p>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 20px 0;">
              If the button doesn't work, copy and paste this link:<br>
              <a href="${data.payment_url}" style="color: #7c3aed; word-break: break-all;">${data.payment_url}</a>
            </p>
            
            <!-- Thank You -->
            <div style="background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; margin: 30px 0;">
              <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">🙏 Thank You!</h3>
              <p style="color: #1e3a8a; margin: 0; font-size: 14px; line-height: 1.6;">
                It was our pleasure to show you Walla Walla wine country. We'd love to hear about your experience! Feel free to reply to this email with any feedback or photos from your tour.
              </p>
            </div>
            
            <!-- Contact Info -->
            <div style="text-align: center; padding: 20px 0; border-top: 2px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">Questions about your invoice?</p>
              <p style="margin: 0;">
                <a href="mailto:info@wallawallatravel.com" style="color: #7c3aed; text-decoration: none; font-weight: 600;">info@wallawallatravel.com</a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="tel:+15095550199" style="color: #7c3aed; text-decoration: none; font-weight: 600;">(509) 555-0199</a>
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              <strong style="color: #1f2937;">${COMPANY_NAME}</strong><br>
              Walla Walla, Washington
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
🍷 Final Invoice - Thank You for Your Tour!

Hi ${data.customer_name},

Thank you for choosing ${COMPANY_NAME}! We hope you enjoyed your tour on ${new Date(data.tour_date).toLocaleDateString()}.

INVOICE DETAILS:
Invoice: ${data.invoice_number}
Booking: ${data.booking_number}
Date: ${new Date(data.tour_date).toLocaleDateString()}
Driver: ${data.driver_name}

SERVICE DETAILS:
Hours: ${data.actual_hours.toFixed(1)} hours
Rate: $${data.hourly_rate.toFixed(2)}/hr
Amount Due: $${data.subtotal.toFixed(2)}

TIP YOUR DRIVER:
If ${data.driver_name} provided excellent service, you can add a tip:
• 15%: $${(data.subtotal * 0.15).toFixed(2)}
• 20%: $${(data.subtotal * 0.20).toFixed(2)} ⭐
• 25%: $${(data.subtotal * 0.25).toFixed(2)}

PAY NOW:
${data.payment_url}

Questions? Contact us:
Email: info@wallawallatravel.com
Phone: (509) 555-0199

${COMPANY_NAME}
Walla Walla, Washington
    `
  }),

  /**
   * Lunch Order Confirmation to Restaurant
   */
  lunchOrderToRestaurant: (data: {
    restaurant_name: string;
    customer_name: string;
    tour_date: string;
    party_size: number;
    arrival_time: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    total: number;
    dietary_restrictions?: string;
    special_requests?: string;
    contact_phone: string;
  }) => ({
    subject: `Lunch Order for ${data.customer_name} - ${data.tour_date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">🍽️ New Lunch Order</h1>
        
        <p>Hello ${data.restaurant_name},</p>
        
        <p>We have a new lunch order for one of our wine tour groups.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Order Details</h2>
          <p><strong>Customer:</strong> ${data.customer_name}</p>
          <p><strong>Date:</strong> ${new Date(data.tour_date).toLocaleDateString()}</p>
          <p><strong>Estimated Arrival:</strong> ${data.arrival_time}</p>
          <p><strong>Party Size:</strong> ${data.party_size}</p>
        </div>
        
        <div style="background: #fff; border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Order Items:</h3>
          ${data.items.map(item => `
            <p style="margin: 5px 0;">
              ${item.quantity}x ${item.name} - $${(item.quantity * item.price).toFixed(2)}
            </p>
          `).join('')}
          <hr style="margin: 15px 0;">
          <p style="font-weight: bold;">Total: $${data.total.toFixed(2)}</p>
        </div>
        
        ${data.dietary_restrictions ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Dietary Restrictions:</strong></p>
            <p style="margin: 5px 0 0 0;">${data.dietary_restrictions}</p>
          </div>
        ` : ''}
        
        ${data.special_requests ? `
          <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📝 Special Requests:</strong></p>
            <p style="margin: 5px 0 0 0;">${data.special_requests}</p>
          </div>
        ` : ''}
        
        <p><strong>Please confirm receipt of this order by replying to this email.</strong></p>
        
        <p>For questions, contact us at ${data.contact_phone}</p>
        
        <p>Thank you!<br>${COMPANY_NAME}</p>
      </div>
    `,
  }),

  /**
   * Tour Offer to Driver
   */
  tourOfferToDriver: (data: {
    driver_name: string;
    customer_name: string;
    tour_date: string;
    start_time: string;
    end_time: string;
    party_size: number;
    pickup_location: string;
    estimated_hours: number;
    pay_amount: number;
    expires_at: string;
    offer_url: string;
    notes?: string;
  }) => ({
    subject: `New Tour Offer - ${data.customer_name} on ${data.tour_date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">🚗 New Tour Offer!</h1>
        
        <p>Hi ${data.driver_name},</p>
        
        <p>You have a new tour offer available. Please review and respond.</p>
        
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="font-size: 14px; margin: 0;">Your Pay</p>
          <p style="font-size: 36px; font-weight: bold; color: #2563eb; margin: 10px 0;">
            $${data.pay_amount.toFixed(2)}
          </p>
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            ${data.estimated_hours} hours
          </p>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Tour Details</h2>
          <p><strong>Customer:</strong> ${data.customer_name}</p>
          <p><strong>Date:</strong> ${new Date(data.tour_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p><strong>Time:</strong> ${data.start_time} - ${data.end_time}</p>
          <p><strong>Party Size:</strong> ${data.party_size} guests</p>
          <p><strong>Pickup:</strong> ${data.pickup_location}</p>
        </div>
        
        ${data.notes ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📝 Notes:</strong></p>
            <p style="margin: 5px 0 0 0;">${data.notes}</p>
          </div>
        ` : ''}
        
        <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #991b1b;">
            ⏰ <strong>This offer expires ${new Date(data.expires_at).toLocaleString()}</strong>
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.offer_url}" style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-right: 10px;">
            ✅ Accept Tour
          </a>
          <a href="${data.offer_url}" style="background: #6b7280; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            View Details
          </a>
        </div>
        
        <p style="font-size: 12px; color: #6b7280;">
          If the buttons don't work, copy and paste this link:<br>
          ${data.offer_url}
        </p>
        
        <p>Drive safe!<br>${COMPANY_NAME} Dispatch</p>
      </div>
    `,
  }),

  /**
   * Tour Assignment Confirmation to Driver
   */
  tourAssignmentConfirmation: (data: {
    driver_name: string;
    customer_name: string;
    booking_number: string;
    tour_date: string;
    start_time: string;
    pickup_location: string;
    vehicle_name?: string;
  }) => ({
    subject: `Tour Confirmed - ${data.booking_number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">✅ Tour Assignment Confirmed</h1>
        
        <p>Hi ${data.driver_name},</p>
        
        <p>You've been assigned to the following tour:</p>
        
        <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #16a34a;">Tour Confirmed</h2>
          <p><strong>Booking:</strong> ${data.booking_number}</p>
          <p><strong>Customer:</strong> ${data.customer_name}</p>
          <p><strong>Date:</strong> ${new Date(data.tour_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p><strong>Pickup Time:</strong> ${data.start_time}</p>
          <p><strong>Pickup Location:</strong> ${data.pickup_location}</p>
          ${data.vehicle_name ? `<p><strong>Vehicle:</strong> ${data.vehicle_name}</p>` : ''}
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ul>
          <li>Review the full itinerary in your driver portal</li>
          <li>Complete pre-trip vehicle inspection</li>
          <li>Arrive 15 minutes early for pickup</li>
        </ul>
        
        <p>Questions? Contact dispatch at (509) 555-WINE</p>
        
        <p>Safe travels!<br>${COMPANY_NAME} Team</p>
      </div>
    `,
  }),
};

/**
 * Send specific notification emails
 */

export async function sendBookingConfirmation(booking: any, customerEmail: string) {
  const template = EmailTemplates.bookingConfirmation(booking);
  return sendEmail({
    to: customerEmail,
    ...template,
  });
}

export async function sendInvoiceEmail(invoice: any, customerEmail: string) {
  const template = EmailTemplates.invoice(invoice);
  return sendEmail({
    to: customerEmail,
    ...template,
  });
}

export async function sendLunchOrderToRestaurant(order: any, restaurantEmail: string) {
  const template = EmailTemplates.lunchOrderToRestaurant(order);
  return sendEmail({
    to: restaurantEmail,
    ...template,
  });
}

export async function sendTourOfferToDriver(offer: any, driverEmail: string) {
  const template = EmailTemplates.tourOfferToDriver(offer);
  return sendEmail({
    to: driverEmail,
    ...template,
  });
}

export async function sendTourAssignmentConfirmation(assignment: any, driverEmail: string) {
  const template = EmailTemplates.tourAssignmentConfirmation(assignment);
  return sendEmail({
    to: driverEmail,
    ...template,
  });
}

export async function sendFinalInvoiceEmail(data: {
  customer_email: string;
  customer_name: string;
  booking_number: string;
  invoice_number: string;
  tour_date: string;
  actual_hours: number;
  hourly_rate: number;
  subtotal: number;
  driver_name: string;
  payment_url: string;
}) {
  const template = EmailTemplates.finalInvoice({
    customer_name: data.customer_name,
    booking_number: data.booking_number,
    invoice_number: data.invoice_number,
    tour_date: data.tour_date,
    actual_hours: data.actual_hours,
    hourly_rate: data.hourly_rate,
    subtotal: data.subtotal,
    driver_name: data.driver_name,
    payment_url: data.payment_url,
  });
  
  return sendEmail({
    to: data.customer_email,
    ...template,
  });
}

