import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/api/middleware/error-handler';
import { getSession } from '@/lib/auth/session';
import { eventOrganizerService } from '@/lib/services/event-organizer.service';
import { inviteOrganizerSchema } from '@/lib/validation/schemas/events';
import { sendEmail } from '@/lib/email';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const validated = inviteOrganizerSchema.parse(body);

  const result = await eventOrganizerService.createInvitation(
    validated,
    session.user.id
  );

  let emailSent = false;
  try {
    await sendEmail({
      to: validated.contact_email,
      subject: 'You\'re invited to join Walla Walla Events as an organizer',
      html: `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #8B1538 0%, #722F37 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Walla Walla Events</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Event Organizer Portal</p>
  </div>
  <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: 0;">
    <h2 style="color: #1f2937; margin: 0 0 16px;">You're Invited!</h2>
    <p style="color: #374151;">Hi ${validated.contact_name},</p>
    <p style="color: #374151;">You've been invited to join Walla Walla Events as an event organizer for <strong>${validated.organization_name}</strong>.</p>
    <p style="color: #374151;">As an organizer you can:</p>
    <ul style="color: #374151;">
      <li>Create and manage events for Walla Walla</li>
      <li>Reach visitors planning trips to wine country</li>
      <li>Track views and engagement on your events</li>
    </ul>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${result.setup_url}" style="display: inline-block; background: #8B1538; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Set Up Your Account</a>
    </div>
    <p style="color: #6b7280; font-size: 13px;">Or copy this link: ${result.setup_url}</p>
    <p style="color: #6b7280; font-size: 13px;">This link expires in 7 days.</p>
  </div>
</div>`,
    });
    emailSent = true;
  } catch {
    emailSent = false;
  }

  return NextResponse.json({
    success: true,
    data: {
      setup_url: result.setup_url,
      email_sent: emailSent,
    },
  });
});
