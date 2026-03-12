/**
 * Cron: Document Renewal Reminders
 *
 * Queries driver_documents expiring within 30 days, sends reminder emails
 * to drivers and an admin digest. Tracks sent reminders to avoid duplicates.
 *
 * Reminder tiers:
 *   - 30-day notice (first warning)
 *   - 14-day notice (follow-up)
 *   - 7-day notice  (urgent)
 *
 * Schedule: daily at 9 AM Pacific (16:00 UTC) — configured in vercel.json
 *
 * @module app/api/cron/document-renewal-reminders/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/api/middleware/cron-auth';
import { withCronLock } from '@/lib/api/middleware/cron-lock';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getBrandEmailConfig } from '@/lib/email-brands';
import {
  buildDocumentRenewalDriverEmail,
  buildDocumentRenewalAdminEmail,
} from '@/lib/email/templates/document-renewal-email';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STAFF_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExpiringDocument {
  doc_id: number;
  driver_id: number;
  driver_name: string;
  driver_email: string | null;
  document_name: string;
  document_type: string;
  expiry_date: string;
  days_until_expiry: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getReminderType(days: number): '7_day' | '14_day' | '30_day' | null {
  if (days <= 7) return '7_day';
  if (days <= 14) return '14_day';
  if (days <= 30) return '30_day';
  return null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const GET = withCronAuth('document-renewal-reminders', async (_request: NextRequest) => {
  return withCronLock('document-renewal-reminders', async () => {
    logger.info('[DocRenewalReminders] Starting document renewal reminder check');

    // 1) Query all active documents expiring within 30 days that haven't
    //    already received the appropriate reminder tier.
    const rows = await prisma.$queryRaw`SELECT
         dd.id                          AS doc_id,
         dd.driver_id,
         u.name                         AS driver_name,
         u.email                        AS driver_email,
         dd.document_name,
         dd.document_type,
         dd.expiry_date::text           AS expiry_date,
         (dd.expiry_date - CURRENT_DATE)::int AS days_until_expiry
       FROM driver_documents dd
       JOIN users u ON u.id = dd.driver_id
       WHERE dd.is_active = true
         AND dd.expiry_date IS NOT NULL
         AND dd.expiry_date >= CURRENT_DATE
         AND dd.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY dd.expiry_date ASC` as ExpiringDocument[];

    if (rows.length === 0) {
      logger.info('[DocRenewalReminders] No documents expiring within 30 days');
      return NextResponse.json({
        success: true,
        message: 'No documents expiring within 30 days',
        driverEmailsSent: 0,
        adminDigestSent: false,
        timestamp: new Date().toISOString(),
      });
    }

    // 2) Filter out documents that already received the appropriate reminder.
    const docsNeedingReminder: ExpiringDocument[] = [];
    for (const doc of rows) {
      const reminderType = getReminderType(doc.days_until_expiry);
      if (!reminderType) continue;

      // Check if this reminder was already sent
      const existing = await prisma.$queryRawUnsafe(
        `SELECT id FROM document_reminders
         WHERE driver_document_id = $1 AND reminder_type = $2
         LIMIT 1`,
        doc.doc_id, reminderType
      ) as Record<string, any>[];

      if (existing.length === 0) {
        docsNeedingReminder.push(doc);
      }
    }

    if (docsNeedingReminder.length === 0) {
      logger.info('[DocRenewalReminders] All reminders already sent');
      return NextResponse.json({
        success: true,
        message: 'All applicable reminders already sent',
        driverEmailsSent: 0,
        adminDigestSent: false,
        timestamp: new Date().toISOString(),
      });
    }

    // 3) Group by driver for per-driver emails
    const byDriver = new Map<number, ExpiringDocument[]>();
    for (const doc of docsNeedingReminder) {
      const list = byDriver.get(doc.driver_id) || [];
      list.push(doc);
      byDriver.set(doc.driver_id, list);
    }

    let driverEmailsSent = 0;
    let driverEmailsFailed = 0;
    const brand = getBrandEmailConfig(undefined);

    // 4) Send per-driver reminder emails
    for (const [driverId, docs] of byDriver) {
      const driverEmail = docs[0].driver_email;
      const driverName = docs[0].driver_name || 'Driver';

      if (!driverEmail) {
        logger.warn('[DocRenewalReminders] No email for driver, skipping', { driverId });
        continue;
      }

      try {
        const template = buildDocumentRenewalDriverEmail({
          driver_name: driverName,
          documents: docs.map(d => ({
            document_name: d.document_name,
            document_type: d.document_type,
            expiry_date: d.expiry_date,
            days_until_expiry: d.days_until_expiry,
          })),
        });

        const success = await sendEmail({
          to: driverEmail,
          from: `${brand.name} <${brand.from_email}>`,
          replyTo: brand.reply_to,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });

        if (success) {
          driverEmailsSent++;
          // Record reminders as sent
          for (const doc of docs) {
            const reminderType = getReminderType(doc.days_until_expiry);
            if (reminderType) {
              await prisma.$queryRawUnsafe(
                `INSERT INTO document_reminders (driver_document_id, reminder_type, recipient_email)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (driver_document_id, reminder_type) DO NOTHING`,
                doc.doc_id, reminderType, driverEmail
              ).catch(() => { /* ON CONFLICT handles duplicates */ });
            }
          }
        } else {
          driverEmailsFailed++;
        }
      } catch (err) {
        driverEmailsFailed++;
        logger.error('[DocRenewalReminders] Failed to send driver email', {
          driverId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 5) Send admin digest with all expiring documents
    let adminDigestSent = false;
    try {
      const adminTemplate = buildDocumentRenewalAdminEmail({
        expiring_documents: docsNeedingReminder.map(d => ({
          driver_name: d.driver_name || 'Unknown',
          driver_email: d.driver_email,
          document_name: d.document_name,
          document_type: d.document_type,
          expiry_date: d.expiry_date,
          days_until_expiry: d.days_until_expiry,
        })),
      });

      const adminSuccess = await sendEmail({
        to: STAFF_EMAIL,
        from: `${brand.name} <${brand.from_email}>`,
        subject: adminTemplate.subject,
        html: adminTemplate.html,
        text: adminTemplate.text,
      });

      adminDigestSent = adminSuccess;
    } catch (err) {
      logger.error('[DocRenewalReminders] Failed to send admin digest', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    logger.info('[DocRenewalReminders] Completed', {
      totalExpiring: docsNeedingReminder.length,
      driverEmailsSent,
      driverEmailsFailed,
      adminDigestSent,
    });

    return NextResponse.json({
      success: true,
      totalExpiring: docsNeedingReminder.length,
      driverEmailsSent,
      driverEmailsFailed,
      adminDigestSent,
      timestamp: new Date().toISOString(),
    });
  });
});

// Support POST for manual triggering
export const POST = GET;
