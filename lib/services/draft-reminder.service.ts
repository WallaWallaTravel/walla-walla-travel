/**
 * Draft Reminder Service
 *
 * Creates CRM tasks as reminders for stale draft proposals.
 * Runs on a 5-day cycle: drafts older than 5 days get a reminder task,
 * then every 5 days thereafter. Priority escalates after 3 reminders.
 */

import { BaseService } from './base.service';
import { logger } from '@/lib/logger';

interface DraftForReminder {
  id: number;
  proposal_number: string;
  customer_name: string;
  customer_id: number | null;
  created_at: string;
  draft_reminder_count: number;
}

class DraftReminderService extends BaseService {
  protected get serviceName(): string {
    return 'DraftReminderService';
  }

  /**
   * Process all draft proposals that need reminders.
   * Called by the daily cron job.
   */
  async processDraftReminders(): Promise<{
    processed: number;
    tasksCreated: number;
    errors: number;
  }> {
    this.log('Processing draft reminders');

    const stats = { processed: 0, tasksCreated: 0, errors: 0 };

    // Find drafts needing reminders:
    // - status = 'draft'
    // - draft_reminders_enabled = true
    // - created > 5 days ago
    // - last reminder > 5 days ago OR never reminded
    const drafts = await this.queryMany<DraftForReminder>(`
      SELECT id, proposal_number, customer_name, customer_id, created_at, draft_reminder_count
      FROM trip_proposals
      WHERE status = 'draft'
        AND draft_reminders_enabled = TRUE
        AND created_at < NOW() - INTERVAL '5 days'
        AND (
          draft_reminder_last_sent_at IS NULL
          OR draft_reminder_last_sent_at < NOW() - INTERVAL '5 days'
        )
    `);

    this.log(`Found ${drafts.length} drafts needing reminders`);

    for (const draft of drafts) {
      try {
        stats.processed++;

        // Determine priority based on reminder count
        let priority = 'normal';
        if (draft.draft_reminder_count >= 5) {
          priority = 'urgent';
        } else if (draft.draft_reminder_count >= 3) {
          priority = 'high';
        }

        const title = `Draft reminder: ${draft.customer_name} proposal ${draft.proposal_number}`;

        // Check for existing pending task with same title to prevent duplicates
        const existingTask = await this.queryOne<{ id: number }>(`
          SELECT id FROM crm_tasks
          WHERE title = $1
            AND status IN ('pending', 'in_progress')
        `, [title]);

        if (existingTask) {
          this.log(`Skipping duplicate task for proposal ${draft.proposal_number}`);
          continue;
        }

        // Create CRM task
        await this.insert('crm_tasks', {
          title,
          description: `Draft proposal ${draft.proposal_number} for ${draft.customer_name} has been sitting in draft status. Please review and either send, update, or archive it.`,
          task_type: 'proposal',
          priority,
          status: 'pending',
          due_date: new Date().toISOString().split('T')[0],
          contact_id: draft.customer_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Update reminder tracking on the proposal
        await this.query(`
          UPDATE trip_proposals
          SET draft_reminder_last_sent_at = NOW(),
              draft_reminder_count = draft_reminder_count + 1,
              updated_at = NOW()
          WHERE id = $1
        `, [draft.id]);

        stats.tasksCreated++;
        this.log(`Created reminder task for proposal ${draft.proposal_number} (reminder #${draft.draft_reminder_count + 1})`);

      } catch (error) {
        stats.errors++;
        this.handleError(error, `processDraftReminder:${draft.id}`);
      }
    }

    logger.info('Draft reminders processing complete', stats);
    return stats;
  }

  /**
   * Disable reminders for a proposal (when sent, converted, or archived)
   */
  async disableReminders(proposalId: number): Promise<void> {
    await this.query(`
      UPDATE trip_proposals
      SET draft_reminders_enabled = FALSE, updated_at = NOW()
      WHERE id = $1
    `, [proposalId]);
    this.log(`Disabled reminders for proposal ${proposalId}`);
  }

  /**
   * Enable reminders for a proposal
   */
  async enableReminders(proposalId: number): Promise<void> {
    await this.query(`
      UPDATE trip_proposals
      SET draft_reminders_enabled = TRUE, updated_at = NOW()
      WHERE id = $1
    `, [proposalId]);
    this.log(`Enabled reminders for proposal ${proposalId}`);
  }
}

export const draftReminderService = new DraftReminderService();
