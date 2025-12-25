import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, UnauthorizedError } from '@/lib/api/middleware/error-handler';
import { validateBody } from '@/lib/api/middleware/validation';
import { getSessionFromRequest } from '@/lib/auth/session';
import { partnerService } from '@/lib/services/partner.service';
import { sendEmail } from '@/lib/email';

const InviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  business_name: z.string().min(1, 'Business name is required'),
  business_type: z.enum(['winery', 'hotel', 'restaurant', 'activity', 'other']),
  winery_id: z.number().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/admin/partners/invite
 * Invite a new partner
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSessionFromRequest(request);
  
  if (!session || session.user.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }

  const data = await validateBody(request, InviteSchema);

  // Create the invitation
  const result = await partnerService.createInvitation(data, session.user.id);

  // Send invitation email
  const emailSent = await sendEmail({
    to: data.email,
    subject: `🤝 You're Invited to Join Walla Walla Travel's Partner Directory`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
                🤝 Partner Invitation
              </h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">
                Walla Walla Travel Directory
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">
                Hello <strong>${data.business_name}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                You've been invited to join the Walla Walla Travel Partner Directory! As a partner, you'll be able to:
              </p>
              
              <ul style="color: #4b5563; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                <li>Manage your business listing and keep it up-to-date</li>
                <li>Add photos, hours, and specialties</li>
                <li>Get recommended by our AI concierge to visitors</li>
                <li>Track how often you're being recommended</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${result.setup_url}" style="display: inline-block; background: #059669; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Set Up Your Account
                </a>
              </div>
              
              <p style="font-size: 14px; color: #9ca3af; text-align: center; margin: 20px 0;">
                This link expires in 7 days.
              </p>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="font-size: 14px; color: #6b7280; margin: 0;">
                  <strong>Link not working?</strong> Copy and paste this URL into your browser:<br>
                  <span style="color: #059669; word-break: break-all;">${result.setup_url}</span>
                </p>
              </div>
              
              <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0;">
                Questions? Just reply to this email and we'll help you get started.
              </p>
              
              <p style="font-size: 16px; color: #1f2937; margin: 30px 0 0 0;">
                Welcome to the team!<br>
                <strong>Walla Walla Travel</strong>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                Walla Walla Travel • Walla Walla, Washington<br>
                © ${new Date().getFullYear()} All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Partner Invitation - Walla Walla Travel

Hello ${data.business_name},

You've been invited to join the Walla Walla Travel Partner Directory!

As a partner, you'll be able to:
- Manage your business listing and keep it up-to-date
- Add photos, hours, and specialties
- Get recommended by our AI concierge to visitors
- Track how often you're being recommended

Set up your account here:
${result.setup_url}

This link expires in 7 days.

Questions? Reply to this email and we'll help you get started.

Welcome to the team!
Walla Walla Travel
    `,
  });

  return NextResponse.json({
    success: true,
    user_id: result.user_id,
    setup_url: result.setup_url,
    email_sent: emailSent,
    message: emailSent 
      ? 'Invitation sent successfully' 
      : 'Partner created but email failed to send. Share the setup link manually.',
    timestamp: new Date().toISOString(),
  });
});







