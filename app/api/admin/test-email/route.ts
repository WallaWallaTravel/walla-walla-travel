import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

/**
 * Test Email Endpoint
 * Send a test email to verify Postmark configuration
 * 
 * POST /api/admin/test-email
 * Body: { email: "recipient@example.com" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Check if POSTMARK_API_KEY is configured
    if (!process.env.POSTMARK_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'POSTMARK_API_KEY not configured',
        instructions: [
          '1. Sign up at https://postmarkapp.com',
          '2. Create a server and get API token',
          '3. Add to .env.local: POSTMARK_API_KEY=your_key',
          '4. Restart the dev server',
        ],
      }, { status: 503 });
    }

    // Send test email
    const result = await sendEmail({
      to: email,
      subject: '✅ Walla Walla Travel - Email Test Successful!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 64px;">🍷</div>
            <h1 style="color: #7c3aed; margin: 20px 0 10px;">Email Configuration Working!</h1>
            <p style="color: #6b7280; font-size: 16px;">
              Your Postmark integration is properly configured.
            </p>
          </div>
          
          <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #16a34a; margin-top: 0;">✅ Configuration Status</h2>
            <ul style="color: #166534; margin: 0; padding-left: 20px;">
              <li>POSTMARK_API_KEY: Configured</li>
              <li>Email delivery: Working</li>
              <li>Templates: Ready</li>
            </ul>
          </div>
          
          <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Available Email Types:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li>Booking confirmations</li>
              <li>Invoice emails</li>
              <li>Driver tour offers</li>
              <li>Driver assignment notifications</li>
              <li>Lunch order confirmations</li>
              <li>Tour reminders</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            Sent from Walla Walla Travel<br>
            Test timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `,
      text: `
Email Configuration Working!

Your Postmark integration is properly configured.

Configuration Status:
✅ POSTMARK_API_KEY: Configured
✅ Email delivery: Working
✅ Templates: Ready

Available Email Types:
- Booking confirmations
- Invoice emails
- Driver tour offers
- Driver assignment notifications
- Lunch order confirmations
- Tour reminders

Sent from Walla Walla Travel
Test timestamp: ${new Date().toISOString()}
      `,
    });

    if (result) {
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${email}`,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Email send failed. Check server logs for details.',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test email' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check configuration status
export async function GET() {
  const hasPostmarkKey = !!process.env.POSTMARK_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@wallawallatravel.com';
  
  return NextResponse.json({
    service: 'Postmark',
    configured: hasPostmarkKey,
    from_email: fromEmail,
    status: hasPostmarkKey ? 'ready' : 'needs_configuration',
    features: hasPostmarkKey ? {
      message_streams: 'Separate transactional & broadcast',
      retention: '45 days',
      inbound_processing: 'Available',
      webhooks: 'Available',
    } : null,
    instructions: hasPostmarkKey ? null : [
      '1. Sign up at https://postmarkapp.com ($15/mo for 10K emails)',
      '2. Create a server and get your Server API Token',
      '3. Verify your sending domain',
      '4. Add to .env.local: POSTMARK_API_KEY=your_token',
      '5. Add to .env.local: FROM_EMAIL=noreply@yourdomain.com',
      '6. Restart the dev server',
      '7. POST to /api/admin/test-email with { "email": "your@email.com" }',
    ],
  });
}

