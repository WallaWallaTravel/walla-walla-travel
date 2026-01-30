/**
 * Non-blocking Email Utilities
 *
 * Uses Next.js 15's `after()` API to send emails without blocking API responses.
 * Emails are queued to run after the response is sent to the client.
 *
 * @module lib/email-async
 *
 * @example
 * ```typescript
 * import { sendEmailAfterResponse } from '@/lib/email-async';
 *
 * export async function POST(request: Request) {
 *   // Do the main work
 *   const result = await createBooking(data);
 *
 *   // Queue email to send after response (non-blocking)
 *   sendEmailAfterResponse({
 *     to: customer.email,
 *     subject: 'Booking Confirmed',
 *     html: emailHtml,
 *   });
 *
 *   // Response goes out immediately
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */

import { after } from 'next/server';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email after the response is sent to the client.
 * This is non-blocking - the API response will be returned immediately
 * and the email will be sent in the background.
 *
 * Use this for notification emails where the client doesn't need to wait.
 * For critical emails where you need to know the result, use sendEmail directly.
 *
 * @param options Email options (same as sendEmail)
 * @param context Optional context for logging (e.g., { bookingId: '123' })
 */
export function sendEmailAfterResponse(
  options: EmailOptions,
  context?: Record<string, unknown>
): void {
  after(async () => {
    try {
      const success = await sendEmail(options);
      if (success) {
        logger.info('Background email sent', {
          subject: options.subject,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          ...context,
        });
      } else {
        logger.warn('Background email failed to send', {
          subject: options.subject,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          ...context,
        });
      }
    } catch (error) {
      logger.error('Background email error', {
        error,
        subject: options.subject,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        ...context,
      });
    }
  });
}

/**
 * Send multiple emails after the response is sent to the client.
 * All emails will be sent in parallel after the response.
 *
 * @param emails Array of email options to send
 * @param context Optional context for logging
 */
export function sendEmailsAfterResponse(
  emails: EmailOptions[],
  context?: Record<string, unknown>
): void {
  after(async () => {
    try {
      const results = await Promise.allSettled(
        emails.map(email => sendEmail(email))
      );

      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.length - succeeded;

      logger.info('Background batch emails completed', {
        total: emails.length,
        succeeded,
        failed,
        ...context,
      });
    } catch (error) {
      logger.error('Background batch email error', { error, ...context });
    }
  });
}
