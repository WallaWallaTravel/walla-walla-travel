/**
 * Admin Internal Reminder Service
 *
 * Manages admin-facing reminders for deferred deposits, milestone triggers,
 * and manual tasks. These reminders are NOT sent to guests — they surface
 * in the admin dashboard.
 *
 * Key triggers:
 *   - skip_deposit_on_accept toggled on → auto-create 60-day reminder
 *   - planning_phase changes to 'finalized' → fire matching milestone reminders
 *   - Time-based: X days before trip start_date
 *
 * @module lib/services/admin-reminder.service
 */

import { query, queryOne } from '@/lib/db-helpers';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminReminder {
  id: number;
  trip_proposal_id: number;
  trigger_type: 'time_based' | 'milestone' | 'manual';
  days_before_trip: number | null;
  trigger_milestone: string | null;
  reminder_date: string | null;
  title: string;
  description: string | null;
  status: 'pending' | 'triggered' | 'dismissed' | 'snoozed';
  snoozed_until: string | null;
  triggered_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Auto-create on skip_deposit_on_accept
// ---------------------------------------------------------------------------

/**
 * When skip_deposit_on_accept is toggled ON, create a 60-day admin reminder
 * to collect the deferred deposit.
 */
async function onSkipDepositEnabled(proposalId: number): Promise<void> {
  try {
    const proposal = await queryOne(
      `SELECT id, start_date, customer_name, proposal_number
       FROM trip_proposals WHERE id = $1`,
      [proposalId]
    );
    if (!proposal) return;

    // Check for existing deferred-deposit reminder to avoid duplicates
    const existing = await queryOne(
      `SELECT id FROM admin_reminders
       WHERE trip_proposal_id = $1
         AND title LIKE '%Deferred Deposit%'
         AND status IN ('pending', 'snoozed')
       LIMIT 1`,
      [proposalId]
    );

    if (existing) return; // Already has one

    // Calculate 60 days before trip or from now, whichever is later
    let reminderDate: string;
    if (proposal.start_date) {
      const tripDate = new Date(proposal.start_date);
      const sixtyBefore = new Date(tripDate);
      sixtyBefore.setDate(sixtyBefore.getDate() - 60);
      const today = new Date();
      reminderDate = sixtyBefore > today
        ? sixtyBefore.toISOString().split('T')[0]
        : today.toISOString().split('T')[0];
    } else {
      // No trip date yet — set for 30 days from now as a check-in
      const d = new Date();
      d.setDate(d.getDate() + 30);
      reminderDate = d.toISOString().split('T')[0];
    }

    await query(
      `INSERT INTO admin_reminders (
        trip_proposal_id, trigger_type, days_before_trip, reminder_date,
        title, description, status
      ) VALUES ($1, 'time_based', 60, $2, $3, $4, 'pending')`,
      [
        proposalId,
        reminderDate,
        `Deferred Deposit: ${proposal.proposal_number}`,
        `The deposit for ${proposal.customer_name} (${proposal.proposal_number}) was deferred. Follow up to collect.`,
      ]
    );

    logger.info('Created deferred deposit admin reminder', { proposalId, reminderDate });
  } catch (error) {
    logger.error('Failed to create deferred deposit reminder', { proposalId, error });
  }
}

/**
 * When skip_deposit_on_accept is toggled OFF, remove the pending deferred deposit reminder.
 */
async function onSkipDepositDisabled(proposalId: number): Promise<void> {
  try {
    await query(
      `UPDATE admin_reminders
       SET status = 'dismissed', dismissed_at = NOW(), updated_at = NOW()
       WHERE trip_proposal_id = $1
         AND title LIKE '%Deferred Deposit%'
         AND status IN ('pending', 'snoozed')`,
      [proposalId]
    );
  } catch (error) {
    logger.error('Failed to dismiss deferred deposit reminder', { proposalId, error });
  }
}

// ---------------------------------------------------------------------------
// Milestone triggers
// ---------------------------------------------------------------------------

/**
 * When planning_phase changes, check for matching milestone reminders and trigger them.
 */
async function onPlanningPhaseChange(proposalId: number, newPhase: string): Promise<void> {
  try {
    const milestoneReminders = await query(
      `SELECT id FROM admin_reminders
       WHERE trip_proposal_id = $1
         AND trigger_type = 'milestone'
         AND trigger_milestone = $2
         AND status = 'pending'`,
      [proposalId, newPhase]
    );

    if (milestoneReminders.rows.length > 0) {
      await query(
        `UPDATE admin_reminders
         SET status = 'triggered', triggered_at = NOW(), updated_at = NOW()
         WHERE trip_proposal_id = $1
           AND trigger_type = 'milestone'
           AND trigger_milestone = $2
           AND status = 'pending'`,
        [proposalId, newPhase]
      );

      logger.info('Triggered milestone admin reminders', {
        proposalId,
        milestone: newPhase,
        count: milestoneReminders.rows.length,
      });
    }
  } catch (error) {
    logger.error('Failed to process milestone reminders', { proposalId, newPhase, error });
  }
}

// ---------------------------------------------------------------------------
// Time-based cron processing
// ---------------------------------------------------------------------------

/**
 * Process time-based admin reminders. Called by daily cron.
 * Triggers any pending reminders where reminder_date <= today.
 */
async function processTimeBased(): Promise<{ triggered: number }> {
  const today = new Date().toISOString().split('T')[0];

  // Also check snoozed reminders whose snooze period has passed
  const result = await query(
    `UPDATE admin_reminders
     SET status = 'triggered', triggered_at = NOW(), updated_at = NOW()
     WHERE status IN ('pending', 'snoozed')
       AND (
         (status = 'pending' AND reminder_date IS NOT NULL AND reminder_date <= $1)
         OR
         (status = 'snoozed' AND snoozed_until IS NOT NULL AND snoozed_until <= $1)
       )
     RETURNING id`,
    [today]
  );

  if (result.rows.length > 0) {
    logger.info('Triggered time-based admin reminders', { count: result.rows.length });
  }

  return { triggered: result.rows.length };
}

// ---------------------------------------------------------------------------
// Admin Actions
// ---------------------------------------------------------------------------

/**
 * Dismiss a reminder (mark as handled)
 */
async function dismissReminder(reminderId: number): Promise<void> {
  await query(
    `UPDATE admin_reminders
     SET status = 'dismissed', dismissed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [reminderId]
  );
}

/**
 * Snooze a reminder for N days
 */
async function snoozeReminder(reminderId: number, days: number): Promise<void> {
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + days);

  await query(
    `UPDATE admin_reminders
     SET status = 'snoozed', snoozed_until = $2, updated_at = NOW()
     WHERE id = $1`,
    [reminderId, snoozeUntil.toISOString().split('T')[0]]
  );
}

/**
 * Create a manual admin reminder
 */
async function createManualReminder(
  proposalId: number,
  title: string,
  description: string,
  reminderDate: string
): Promise<{ id: number }> {
  const result = await queryOne<{ id: number }>(
    `INSERT INTO admin_reminders (
      trip_proposal_id, trigger_type, reminder_date, title, description, status
    ) VALUES ($1, 'manual', $2, $3, $4, 'pending')
    RETURNING id`,
    [proposalId, reminderDate, title, description]
  );

  if (!result) {
    throw new Error('Failed to create admin reminder');
  }

  return result;
}

/**
 * Create a milestone-triggered reminder
 */
async function createMilestoneReminder(
  proposalId: number,
  milestone: string,
  title: string,
  description: string
): Promise<{ id: number }> {
  const result = await queryOne<{ id: number }>(
    `INSERT INTO admin_reminders (
      trip_proposal_id, trigger_type, trigger_milestone, title, description, status
    ) VALUES ($1, 'milestone', $2, $3, $4, 'pending')
    RETURNING id`,
    [proposalId, milestone, title, description]
  );

  if (!result) {
    throw new Error('Failed to create milestone reminder');
  }

  return result;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Get all admin reminders for a proposal
 */
async function getReminders(proposalId: number): Promise<AdminReminder[]> {
  const result = await query<AdminReminder>(
    `SELECT * FROM admin_reminders
     WHERE trip_proposal_id = $1
     ORDER BY
       CASE status WHEN 'triggered' THEN 0 WHEN 'pending' THEN 1 WHEN 'snoozed' THEN 2 ELSE 3 END,
       reminder_date ASC NULLS LAST`,
    [proposalId]
  );
  return result.rows;
}

/**
 * Get all triggered (unhandled) admin reminders across all proposals.
 * Used for the admin dashboard widget.
 */
async function getTriggeredReminders(): Promise<(AdminReminder & { proposal_number: string; customer_name: string })[]> {
  const result = await query<AdminReminder & { proposal_number: string; customer_name: string }>(
    `SELECT ar.*, tp.proposal_number, tp.customer_name
     FROM admin_reminders ar
     JOIN trip_proposals tp ON tp.id = ar.trip_proposal_id
     WHERE ar.status = 'triggered'
     ORDER BY ar.triggered_at DESC`,
    []
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const adminReminderService = {
  onSkipDepositEnabled,
  onSkipDepositDisabled,
  onPlanningPhaseChange,
  processTimeBased,
  dismissReminder,
  snoozeReminder,
  createManualReminder,
  createMilestoneReminder,
  getReminders,
  getTriggeredReminders,
};
