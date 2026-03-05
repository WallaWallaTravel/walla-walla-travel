/**
 * Guest Magic Link Email Template
 *
 * @module lib/email/templates/guest-magic-link
 * @description Sends a magic link email for guest portal authentication.
 */

import { sendEmail } from '@/lib/email';
import { emailDarkModeStyles } from '@/lib/email/dark-mode-styles';
import { logger } from '@/lib/logger';

const COMPANY_NAME = 'Walla Walla Travel';
const COMPANY_EMAIL = 'info@wallawalla.travel';

interface SendGuestMagicLinkOptions {
  email: string;
  name: string | null;
  token: string;
}

/**
 * Send a magic link email to a guest for portal access.
 */
export async function sendGuestMagicLinkEmail(
  options: SendGuestMagicLinkOptions
): Promise<boolean> {
  const { email, name, token } = options;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${appUrl}/api/guest/auth/verify/${token}`;
  const greeting = name ? `Hi ${name}` : 'Hi there';

  const subject = `Your ${COMPANY_NAME} Guest Portal Link`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${emailDarkModeStyles()}
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#8B1538,#722F37); border-radius:12px 12px 0 0; padding:32px 40px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">
                ${COMPANY_NAME}
              </h1>
              <p style="margin:8px 0 0; color:#f1c8d4; font-size:14px;">
                Guest Portal Access
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff; padding:40px; border-left:1px solid #e2e8f0; border-right:1px solid #e2e8f0;">
              <p style="margin:0 0 16px; color:#1e293b; font-size:16px; line-height:1.6;">
                ${greeting},
              </p>
              <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.6;">
                Click the button below to access your guest portal. You'll be able to view your trip details, update your preferences, and manage your information.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${verifyUrl}"
                       style="display:inline-block; background-color:#8B1538; color:#ffffff; text-decoration:none; font-size:16px; font-weight:600; padding:14px 32px; border-radius:8px;">
                      Access Guest Portal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px; color:#64748b; font-size:13px; line-height:1.5;">
                This link expires in 48 hours. If you didn't request this, you can safely ignore this email.
              </p>

              <!-- Fallback URL -->
              <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.5; word-break:break-all;">
                If the button doesn't work, copy and paste this URL:<br>
                <a href="${verifyUrl}" style="color:#8B1538;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
              <p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.5;">
                ${COMPANY_NAME} &bull; ${COMPANY_EMAIL}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting},

Access your guest portal using this link:
${verifyUrl}

This link expires in 48 hours. If you didn't request this, you can safely ignore this email.

${COMPANY_NAME}
${COMPANY_EMAIL}`;

  try {
    return await sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  } catch (error) {
    logger.error('Failed to send guest magic link email', { email, error });
    return false;
  }
}
