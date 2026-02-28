/**
 * Daily Digest Service
 *
 * Aggregates daily action items and sends a digest email to staff.
 * Used by both the daily-digest cron and the Today's Priorities API.
 */

import { BaseService } from './base.service';
import { buildDailyDigestEmail, type DailyDigestData } from '@/lib/email/templates/daily-digest-email';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

const STAFF_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || 'info@wallawalla.travel';

class DailyDigestService extends BaseService {
  protected get serviceName(): string {
    return 'DailyDigestService';
  }

  /**
   * Generate digest data — used by both the email and the Today's Priorities page.
   */
  async generateDigest(): Promise<DailyDigestData> {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Run all queries in parallel
    const [overdueTasks, todayTasks, draftProposals, upcomingTrips, triggeredReminders] = await Promise.all([
      // Overdue tasks
      this.queryMany<{ id: number; title: string; due_date: string; priority: string }>(`
        SELECT id, title, due_date, priority
        FROM crm_tasks
        WHERE due_date < $1
          AND status IN ('pending', 'in_progress')
        ORDER BY due_date ASC
      `, [today]),

      // Today's tasks
      this.queryMany<{ id: number; title: string; due_date: string; priority: string }>(`
        SELECT id, title, due_date, priority
        FROM crm_tasks
        WHERE due_date = $1
          AND status IN ('pending', 'in_progress')
        ORDER BY priority DESC, created_at ASC
      `, [today]),

      // Draft proposals
      this.queryMany<{ id: number; proposal_number: string; customer_name: string; created_at: string; trip_type: string; party_size: number; draft_reminders_enabled: boolean }>(`
        SELECT id, proposal_number, customer_name, created_at, trip_type, party_size,
               COALESCE(draft_reminders_enabled, true) as draft_reminders_enabled
        FROM trip_proposals
        WHERE status = 'draft'
        ORDER BY created_at ASC
      `),

      // Upcoming trips (next 7 days)
      this.queryMany<{ id: number; proposal_number: string; customer_name: string; start_date: string; trip_type: string }>(`
        SELECT id, proposal_number, customer_name, start_date, trip_type
        FROM trip_proposals
        WHERE status IN ('accepted', 'booked')
          AND start_date BETWEEN $1 AND $2
        ORDER BY start_date ASC
      `, [today, sevenDaysFromNow]),

      // Triggered admin reminders
      this.queryMany<{ id: number; reminder_type: string; message: string }>(`
        SELECT id, reminder_type, message
        FROM admin_reminders
        WHERE status = 'triggered'
        ORDER BY created_at DESC
      `),
    ]);

    return {
      overdueTasks,
      todayTasks,
      draftProposals,
      upcomingTrips,
      triggeredReminders,
    };
  }

  /**
   * Generate and send the daily digest email.
   * Skips sending if there are no action items.
   */
  async sendDigest(): Promise<{
    sent: boolean;
    sections: string[];
  }> {
    const data = await this.generateDigest();

    // Check if there's anything to report
    const sections: string[] = [];
    if (data.overdueTasks.length > 0) sections.push('overdueTasks');
    if (data.todayTasks.length > 0) sections.push('todayTasks');
    if (data.draftProposals.length > 0) sections.push('draftProposals');
    if (data.upcomingTrips.length > 0) sections.push('upcomingTrips');
    if (data.triggeredReminders.length > 0) sections.push('triggeredReminders');

    if (sections.length === 0) {
      this.log('No action items — skipping digest email');
      return { sent: false, sections: [] };
    }

    const email = buildDailyDigestEmail(data);

    const sent = await sendEmail({
      to: STAFF_EMAIL,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (sent) {
      logger.info('Daily digest email sent', { to: STAFF_EMAIL, sections });
    } else {
      logger.warn('Daily digest email failed to send', { to: STAFF_EMAIL });
    }

    return { sent, sections };
  }
}

export const dailyDigestService = new DailyDigestService();
