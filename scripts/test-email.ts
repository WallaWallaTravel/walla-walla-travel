/**
 * Test Email Delivery Script
 * Run with: npx tsx scripts/test-email.ts
 */

import { Resend } from 'resend';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testEmail() {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'bookings@wallawalla.travel';
  const STAFF_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  console.log('\n📧 Email Configuration Test\n');
  console.log('=' .repeat(50));
  console.log(`RESEND_API_KEY: ${RESEND_API_KEY ? RESEND_API_KEY.substring(0, 10) + '...' : '❌ NOT SET'}`);
  console.log(`FROM_EMAIL: ${FROM_EMAIL}`);
  console.log(`STAFF_EMAIL: ${STAFF_EMAIL}`);
  console.log(`APP_URL: ${APP_URL}`);
  console.log('=' .repeat(50));

  if (!RESEND_API_KEY) {
    console.error('\n❌ RESEND_API_KEY is not set. Cannot send test email.');
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);

  const testDate = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'full',
    timeStyle: 'long',
  });

  console.log(`\n📤 Sending test email to: ${STAFF_EMAIL}...`);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: STAFF_EMAIL,
      subject: '✅ Walla Walla Travel - Email Test Successful',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🍷 Walla Walla Travel</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Email System Test</p>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1E3A5F; margin-top: 0;">✅ Email Delivery Successful!</h2>
            <p>This is a test email to verify that the Resend email service is properly configured.</p>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Configuration Details:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                <li>Test Time: ${testDate}</li>
                <li>From: ${FROM_EMAIL}</li>
                <li>To: ${STAFF_EMAIL}</li>
                <li>Service: Resend</li>
              </ul>
            </div>

            <p style="color: #059669; font-weight: 500;">✓ Your email configuration is working correctly!</p>
          </div>
        </body>
        </html>
      `,
      text: `Walla Walla Travel - Email Test\n\n✅ Email Delivery Successful!\n\nTest Time: ${testDate}\nService: Resend`,
    });

    if (error) {
      console.error('\n❌ Email send failed:', error);
      process.exit(1);
    }

    console.log('\n✅ Email sent successfully!');
    console.log(`   Email ID: ${data?.id}`);
    console.log(`   Check inbox at: ${STAFF_EMAIL}`);
    console.log('\n');
  } catch (err) {
    console.error('\n❌ Error sending email:', err);
    process.exit(1);
  }
}

testEmail();
