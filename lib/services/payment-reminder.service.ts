/**
 * Payment Reminder Service
 *
 * Manages automated payment reminders for per-guest billing.
 * Schedules escalating reminders (friendly → firm → urgent → final)
 * and processes them daily via cron.
 *
 * CRITICAL SAFETY RULE: Always re-query guest payment status from the DB
 * at send time — never use cached or stale data for send decisions.
 *
 * @module lib/services/payment-reminder.service
 */

import { query, queryOne, withTransaction } from '@/lib/db-helpers';
import { sendEmail } from '@/lib/email';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { logger } from '@/lib/logger';
import {
  paymentReminderFriendly,
  paymentReminderFirm,
  paymentReminderUrgent,
  paymentReminderFinal,
} from '@/lib/email/templates/payment-reminder-emails';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentReminder {
  id: number;
  trip_proposal_id: number;
  guest_id: number | null;
  reminder_type: 'auto_schedule' | 'manual' | 'admin_internal';
  scheduled_date: string;
  days_before_deadline: number | null;
  urgency: 'friendly' | 'firm' | 'urgent' | 'final';
  status: 'pending' | 'processing' | 'sent' | 'skipped' | 'cancelled';
  sent_at: string | null;
  skip_reason: string | null;
  paused: boolean;
  custom_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ReminderHistoryRow extends PaymentReminder {
  guest_name: string | null;
  guest_email: string | null;
}

interface ReminderScheduleConfig {
  days_before: number;
  urgency: 'friendly' | 'firm' | 'urgent' | 'final';
}

const VALID_URGENCIES = ['friendly', 'firm', 'urgent', 'final'] as const;

// Default auto-schedule: 30, 20, 10, 5, 1 days before deadline
const DEFAULT_SCHEDULE: ReminderScheduleConfig[] = [
  { days_before: 30, urgency: 'friendly' },
  { days_before: 20, urgency: 'friendly' },
  { days_before: 10, urgency: 'firm' },
  { days_before: 5,  urgency: 'urgent' },
  { days_before: 1,  urgency: 'final' },
];

// ---------------------------------------------------------------------------
// Generate Reminder Schedule
// ---------------------------------------------------------------------------

/**
 * Creates auto-scheduled reminders for all unpaid guests on a proposal.
 * Deletes existing pending auto-reminders and regenerates fresh.
 */
async function generateReminderSchedule(proposalId: number): Promise<{ created: number }> {
  // Fetch proposal deadline
  const proposal = await queryOne(
    `SELECT id, payment_deadline, reminders_paused, individual_billing_enabled
     FROM trip_proposals WHERE id = $1`,
    [proposalId]
  );

  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  if (!proposal.payment_deadline) {
    throw new Error('Cannot generate reminders without a payment deadline');
  }

  if (!proposal.individual_billing_enabled) {
    throw new Error('Individual billing is not enabled for this proposal');
  }

  const deadline = new Date(proposal.payment_deadline);

  // C9: Reject if deadline is in the past
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (deadline <= now) {
    throw new Error('Cannot generate reminders for a past deadline');
  }

  let created = 0;

  // C2 (TOCTOU fix): Move unpaidGuests query inside the transaction
  await withTransaction(async (client) => {
    // Get all non-sponsored, unpaid guests inside the transaction
    const unpaidGuests = await query(
      `SELECT id FROM trip_proposal_guests
       WHERE trip_proposal_id = $1
         AND is_sponsored = FALSE
         AND payment_status NOT IN ('paid', 'refunded')`,
      [proposalId],
      client
    );

    if (unpaidGuests.rows.length === 0) {
      return;
    }

    // Remove existing pending auto-reminders for this proposal
    await client.query(
      `DELETE FROM payment_reminders
       WHERE trip_proposal_id = $1
         AND reminder_type = 'auto_schedule'
         AND status = 'pending'`,
      [proposalId]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const guest of unpaidGuests.rows) {
      for (const config of DEFAULT_SCHEDULE) {
        const scheduledDate = new Date(deadline);
        scheduledDate.setDate(scheduledDate.getDate() - config.days_before);

        // Don't create reminders in the past
        if (scheduledDate <= today) {
          continue;
        }

        await client.query(
          `INSERT INTO payment_reminders (
            trip_proposal_id, guest_id, reminder_type, scheduled_date,
            days_before_deadline, urgency, status
          ) VALUES ($1, $2, 'auto_schedule', $3, $4, $5, 'pending')`,
          [proposalId, guest.id, scheduledDate.toISOString().split('T')[0], config.days_before, config.urgency]
        );
        created++;
      }
    }
  });

  // Log activity
  try {
    await query(
      `INSERT INTO trip_proposal_activity (trip_proposal_id, activity_type, description, metadata)
       VALUES ($1, 'reminders_generated', $2, $3)`,
      [
        proposalId,
        `Generated ${created} payment reminders`,
        JSON.stringify({ reminder_count: created }),
      ]
    );
  } catch {
    // Activity logging is non-critical
  }

  return { created };
}

// ---------------------------------------------------------------------------
// Process Scheduled Reminders (CRON)
// ---------------------------------------------------------------------------

/**
 * THE CRITICAL METHOD — called by daily cron job.
 *
 * Uses an atomic UPDATE ... RETURNING pattern to claim pending reminders,
 * preventing duplicate sends when two cron runs overlap (B1 fix).
 *
 * For each claimed reminder:
 * 1. Re-query guest payment_status from DB (NEVER use cached data)
 * 2. Skip if guest already paid
 * 3. Skip if proposal reminders paused
 * 4. Skip if zero/negative amount remaining (B7 fix)
 * 5. Otherwise, send email and mark sent
 */
async function processScheduledReminders(): Promise<{
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{ reminder_id: number; action: string; reason?: string }>;
}> {
  const today = new Date().toISOString().split('T')[0];

  // B1 FIX: Atomically claim pending reminders — no other process can grab these.
  // FOR UPDATE SKIP LOCKED ensures concurrent cron runs don't overlap.
  const pendingReminders = await query<PaymentReminder>(
    `UPDATE payment_reminders
     SET status = 'processing', updated_at = NOW()
     WHERE id IN (
       SELECT id FROM payment_reminders
       WHERE status = 'pending'
         AND scheduled_date <= $1
         AND paused = FALSE
       ORDER BY scheduled_date ASC,
         CASE urgency WHEN 'final' THEN 0 WHEN 'urgent' THEN 1 WHEN 'firm' THEN 2 WHEN 'friendly' THEN 3 END
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [today]
  );

  const results = {
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [] as Array<{ reminder_id: number; action: string; reason?: string }>,
  };

  // C1 FIX: Cache proposal data to avoid N+1 queries
  interface CachedProposal {
    id: number; reminders_paused: boolean; payment_deadline: string;
    proposal_number: string; brand_id: number; customer_name: string;
    trip_type: string; start_date: string; access_token: string;
  }
  const proposalCache = new Map<number, CachedProposal>();

  for (const reminder of pendingReminders.rows) {
    try {
      // ---------------------------------------------------------------
      // SAFETY: Fresh DB reads for every decision — never cached
      // ---------------------------------------------------------------

      // Check 1: Get proposal data (cached per cron run for N+1 fix)
      let proposal = proposalCache.get(reminder.trip_proposal_id);
      if (!proposal) {
        const p = await queryOne<CachedProposal>(
          `SELECT id, reminders_paused, payment_deadline, proposal_number, brand_id,
                  customer_name, trip_type, start_date, access_token
           FROM trip_proposals WHERE id = $1`,
          [reminder.trip_proposal_id]
        );

        if (!p) {
          await skipReminder(reminder.id, 'Proposal not found');
          results.skipped++;
          results.details.push({ reminder_id: reminder.id, action: 'skipped', reason: 'Proposal not found' });
          continue;
        }
        proposal = p;
        proposalCache.set(reminder.trip_proposal_id, proposal);
      }

      if (proposal.reminders_paused) {
        await skipReminder(reminder.id, 'Proposal reminders paused');
        results.skipped++;
        results.details.push({ reminder_id: reminder.id, action: 'skipped', reason: 'Proposal paused' });
        continue;
      }

      // Check 2: RE-QUERY guest payment status (the most important safety check)
      if (reminder.guest_id) {
        const guest = await queryOne<{
          id: number; guest_name: string; guest_email: string;
          payment_status: string; amount_owed: number; amount_paid: number;
          is_sponsored: boolean; guest_token: string;
        }>(
          `SELECT id, guest_name, guest_email, payment_status, amount_owed, amount_paid, is_sponsored, guest_access_token as guest_token
           FROM trip_proposal_guests WHERE id = $1`,
          [reminder.guest_id]
        );

        if (!guest) {
          await skipReminder(reminder.id, 'Guest not found');
          results.skipped++;
          results.details.push({ reminder_id: reminder.id, action: 'skipped', reason: 'Guest not found' });
          continue;
        }

        if (guest.is_sponsored) {
          await skipReminder(reminder.id, 'Guest is sponsored');
          results.skipped++;
          results.details.push({ reminder_id: reminder.id, action: 'skipped', reason: 'Guest sponsored' });
          continue;
        }

        if (guest.payment_status === 'paid') {
          await skipReminder(reminder.id, 'Guest already paid');
          results.skipped++;
          results.details.push({ reminder_id: reminder.id, action: 'skipped', reason: 'Already paid' });
          continue;
        }

        // B7 FIX: Skip if zero/negative amount remaining
        const amountRemaining = Number(guest.amount_owed) - Number(guest.amount_paid);
        if (amountRemaining <= 0) {
          await skipReminder(reminder.id, 'No amount remaining');
          results.skipped++;
          results.details.push({ reminder_id: reminder.id, action: 'skipped', reason: 'No amount remaining' });
          continue;
        }

        if (!guest.guest_email) {
          await skipReminder(reminder.id, 'Guest has no email address');
          results.skipped++;
          results.details.push({ reminder_id: reminder.id, action: 'skipped', reason: 'No email' });
          continue;
        }

        // All checks pass — send the reminder email
        // C1 FIX: Pass cached proposal data + guest token to avoid redundant queries
        const success = await sendReminderEmail(reminder, guest, proposal);

        if (success) {
          await markReminderSent(reminder.id);
          results.sent++;
          results.details.push({ reminder_id: reminder.id, action: 'sent' });
        } else {
          results.failed++;
          results.details.push({ reminder_id: reminder.id, action: 'failed', reason: 'Email send failed' });
        }
      } else {
        // Reminder without a specific guest — skip (shouldn't happen for payment reminders)
        await skipReminder(reminder.id, 'No guest associated');
        results.skipped++;
        results.details.push({ reminder_id: reminder.id, action: 'skipped', reason: 'No guest' });
      }
    } catch (error) {
      logger.error('Error processing reminder', { reminder_id: reminder.id, error });
      results.failed++;
      results.details.push({
        reminder_id: reminder.id,
        action: 'failed',
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info('Payment reminders processed', {
    total: pendingReminders.rows.length,
    sent: results.sent,
    skipped: results.skipped,
    failed: results.failed,
  });

  return results;
}

// ---------------------------------------------------------------------------
// Send Reminder Email
// ---------------------------------------------------------------------------

async function sendReminderEmail(
  reminder: PaymentReminder,
  guest: { id: number; guest_name: string; guest_email: string; amount_owed: number; amount_paid: number; guest_token: string },
  proposal: { id: number; proposal_number: string; brand_id: number; customer_name: string; trip_type: string; start_date: string; payment_deadline: string; access_token: string }
): Promise<boolean> {
  const brand = getBrandEmailConfig(proposal.brand_id);
  const amountRemaining = Number(guest.amount_owed) - Number(guest.amount_paid);
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wallawalla.travel';

  // C1 FIX: Use data already available from the proposal + guest query — no redundant DB calls
  const paymentLink = `${BASE_URL}/my-trip/${proposal.access_token}/guest/${guest.guest_token}/pay`;

  const templateData = {
    guest_name: guest.guest_name,
    amount_remaining: amountRemaining,
    payment_deadline: formatDateForEmail(proposal.payment_deadline),
    trip_name: proposal.trip_type || proposal.customer_name,
    trip_date: proposal.start_date ? formatDateForEmail(proposal.start_date) : 'TBD',
    payment_link: paymentLink,
    custom_message: reminder.custom_message || undefined,
    brand_id: proposal.brand_id,
  };

  // Select template based on urgency
  let template: { subject: string; html: string; text: string };
  switch (reminder.urgency) {
    case 'friendly':
      template = paymentReminderFriendly(templateData);
      break;
    case 'firm':
      template = paymentReminderFirm(templateData);
      break;
    case 'urgent':
      template = paymentReminderUrgent(templateData);
      break;
    case 'final':
      template = paymentReminderFinal(templateData);
      break;
  }

  try {
    const success = await sendEmail({
      to: guest.guest_email,
      from: `${brand.name} <${brand.from_email}>`,
      replyTo: brand.reply_to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    // Audit logging for sent emails
    try {
      await query(
        `INSERT INTO email_logs (
          trip_proposal_id, email_type, recipient, subject, sent_at, status
        ) VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [
          proposal.id,
          `payment_reminder_${reminder.urgency}`,
          guest.guest_email,
          template.subject,
          success ? 'sent' : 'failed',
        ]
      );
    } catch {
      // email_logs is non-critical
    }

    return success;
  } catch (error) {
    logger.error('Failed to send payment reminder email', {
      reminder_id: reminder.id,
      guest_id: guest.id,
      error,
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function skipReminder(reminderId: number, reason: string): Promise<void> {
  await query(
    `UPDATE payment_reminders
     SET status = 'skipped', skip_reason = $2, updated_at = NOW()
     WHERE id = $1 AND status IN ('pending', 'processing')`,
    [reminderId, reason]
  );
}

async function markReminderSent(reminderId: number): Promise<void> {
  await query(
    `UPDATE payment_reminders
     SET status = 'sent', sent_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'processing'`,
    [reminderId]
  );
}

/**
 * Format a date string for email display.
 * D fix: Parse with explicit noon UTC to avoid timezone drift.
 */
function formatDateForEmail(dateStr: string): string {
  try {
    // Use noon UTC to prevent date shifting across timezones
    const isoDate = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00Z`;
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Pause / Resume
// ---------------------------------------------------------------------------

/**
 * Pause all reminders for a specific guest
 */
async function pauseRemindersForGuest(guestId: number): Promise<void> {
  await query(
    `UPDATE payment_reminders
     SET paused = TRUE, updated_at = NOW()
     WHERE guest_id = $1 AND status = 'pending'`,
    [guestId]
  );
}

/**
 * Resume all reminders for a specific guest
 */
async function resumeRemindersForGuest(guestId: number): Promise<void> {
  await query(
    `UPDATE payment_reminders
     SET paused = FALSE, updated_at = NOW()
     WHERE guest_id = $1 AND status = 'pending'`,
    [guestId]
  );
}

/**
 * Pause all reminders at the proposal level
 */
async function pauseRemindersForProposal(proposalId: number): Promise<void> {
  await query(
    `UPDATE trip_proposals SET reminders_paused = TRUE WHERE id = $1`,
    [proposalId]
  );
}

/**
 * Resume all reminders at the proposal level
 */
async function resumeRemindersForProposal(proposalId: number): Promise<void> {
  await query(
    `UPDATE trip_proposals SET reminders_paused = FALSE WHERE id = $1`,
    [proposalId]
  );
}

// ---------------------------------------------------------------------------
// Manual Reminders
// ---------------------------------------------------------------------------

/**
 * Add a manual reminder for a specific guest or all guests
 * C4 fix: Validates scheduled date and urgency
 */
async function addManualReminder(
  proposalId: number,
  scheduledDate: string,
  urgency: 'friendly' | 'firm' | 'urgent' | 'final',
  customMessage?: string,
  guestId?: number
): Promise<{ id: number }> {
  // C4: Validate urgency
  if (!VALID_URGENCIES.includes(urgency)) {
    throw new Error(`Invalid urgency: ${urgency}. Must be one of: ${VALID_URGENCIES.join(', ')}`);
  }

  // C4: Validate scheduled date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  // C4: Validate date is not in the past
  const dateObj = new Date(`${scheduledDate}T12:00:00Z`);
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date');
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today) {
    throw new Error('Cannot schedule a reminder in the past');
  }

  const result = await queryOne<{ id: number }>(
    `INSERT INTO payment_reminders (
      trip_proposal_id, guest_id, reminder_type, scheduled_date,
      urgency, status, custom_message
    ) VALUES ($1, $2, 'manual', $3, $4, 'pending', $5)
    RETURNING id`,
    [proposalId, guestId || null, scheduledDate, urgency, customMessage || null]
  );

  if (!result) {
    throw new Error('Failed to create manual reminder');
  }

  return result;
}

// ---------------------------------------------------------------------------
// Query / History
// ---------------------------------------------------------------------------

/**
 * Get all reminders for a proposal (full history)
 * D fix: Extended return type with guest_name, guest_email
 */
async function getReminderHistory(proposalId: number): Promise<ReminderHistoryRow[]> {
  const result = await query<ReminderHistoryRow>(
    `SELECT pr.*, tpg.guest_name, tpg.guest_email
     FROM payment_reminders pr
     LEFT JOIN trip_proposal_guests tpg ON tpg.id = pr.guest_id
     WHERE pr.trip_proposal_id = $1
     ORDER BY pr.scheduled_date DESC, pr.created_at DESC`,
    [proposalId]
  );
  return result.rows;
}

/**
 * Cancel a specific pending reminder
 * D fix: Check rowCount and throw if no rows affected
 */
async function cancelReminder(reminderId: number): Promise<void> {
  const result = await query(
    `UPDATE payment_reminders
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [reminderId]
  );

  if (result.rowCount === 0) {
    throw new Error(`Reminder ${reminderId} not found or not in pending status`);
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const paymentReminderService = {
  generateReminderSchedule,
  processScheduledReminders,
  pauseRemindersForGuest,
  resumeRemindersForGuest,
  pauseRemindersForProposal,
  resumeRemindersForProposal,
  addManualReminder,
  getReminderHistory,
  cancelReminder,
};
