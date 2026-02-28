/**
 * Daily Digest Email Template
 *
 * Aggregated morning email showing all action items: overdue tasks,
 * today's tasks, draft proposals, upcoming trips, and triggered reminders.
 *
 * @module lib/email/templates/daily-digest-email
 */

import { getBrandEmailConfig, type BrandEmailConfig } from '@/lib/email-brands';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wallawalla.travel';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailShell(brand: BrandEmailConfig, headingText: string, subheadingText: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${brand.primary_color} 0%, ${brand.secondary_color} 100%); padding: 40px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold;">${headingText}</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 12px 0 0 0; font-size: 15px;">${subheadingText}</p>
    </div>

    <!-- Body -->
    <div style="padding: 36px 28px;">
${bodyHtml}
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 28px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
        Questions? We're here to help.
      </p>
      <p style="margin: 0; font-size: 14px; color: #111827;">
        <strong>${brand.phone}</strong> &bull;
        <a href="mailto:${brand.reply_to}" style="color: ${brand.primary_color}; text-decoration: none;">${brand.reply_to}</a>
      </p>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #6b7280;">
        ${brand.name} &bull; ${brand.website}
      </p>
    </div>

  </div>
</body>
</html>`;
}

function ctaButton(brand: BrandEmailConfig, label: string, url: string): string {
  const safeUrl = escapeHtml(url);
  return `<div style="text-align: center; margin: 32px 0;">
        <a href="${safeUrl}" style="display: inline-block; background-color: ${brand.primary_color}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">${label}</a>
      </div>`;
}

// Section builders

interface DigestTask {
  id: number;
  title: string;
  due_date: string;
  priority: string;
}

interface DigestDraft {
  id: number;
  proposal_number: string;
  customer_name: string;
  created_at: string;
}

interface DigestTrip {
  id: number;
  proposal_number: string;
  customer_name: string;
  start_date: string;
  trip_type: string;
}

interface DigestReminder {
  id: number;
  reminder_type: string;
  message: string;
}

export interface DailyDigestData {
  overdueTasks: DigestTask[];
  todayTasks: DigestTask[];
  draftProposals: DigestDraft[];
  upcomingTrips: DigestTrip[];
  triggeredReminders: DigestReminder[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildSection(title: string, color: string, items: string[], count: number): string {
  if (count === 0) return '';
  return `
      <div style="margin-bottom: 28px;">
        <div style="background: ${color}10; border-left: 4px solid ${color}; padding: 12px 16px; margin-bottom: 12px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: ${color};">${title} (${count})</h2>
        </div>
        ${items.join('')}
      </div>`;
}

function taskItem(task: DigestTask): string {
  return `<div style="padding: 8px 16px; border-bottom: 1px solid #f3f4f6;">
          <p style="margin: 0; font-size: 14px; color: #111827;">${escapeHtml(task.title)}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Due: ${formatDate(task.due_date)} &bull; Priority: ${escapeHtml(task.priority)}</p>
        </div>`;
}

function draftItem(draft: DigestDraft): string {
  const createdDate = new Date(draft.created_at);
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  return `<div style="padding: 8px 16px; border-bottom: 1px solid #f3f4f6;">
          <p style="margin: 0; font-size: 14px; color: #111827;">${escapeHtml(draft.customer_name)} (${escapeHtml(draft.proposal_number)})</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">${daysOld} days old</p>
        </div>`;
}

function tripItem(trip: DigestTrip): string {
  return `<div style="padding: 8px 16px; border-bottom: 1px solid #f3f4f6;">
          <p style="margin: 0; font-size: 14px; color: #111827;">${escapeHtml(trip.customer_name)} &mdash; ${escapeHtml(trip.proposal_number)}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">${formatDate(trip.start_date)} &bull; ${escapeHtml(trip.trip_type.replace(/_/g, ' '))}</p>
        </div>`;
}

function reminderItem(reminder: DigestReminder): string {
  return `<div style="padding: 8px 16px; border-bottom: 1px solid #f3f4f6;">
          <p style="margin: 0; font-size: 14px; color: #111827;">${escapeHtml(reminder.message)}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Type: ${escapeHtml(reminder.reminder_type)}</p>
        </div>`;
}

export function buildDailyDigestEmail(data: DailyDigestData): { subject: string; html: string; text: string } {
  const brand = getBrandEmailConfig(1); // Always Walla Walla Travel brand

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const taskCount = data.overdueTasks.length + data.todayTasks.length;
  const draftCount = data.draftProposals.length;

  const subject = `Daily Digest: ${taskCount} task${taskCount !== 1 ? 's' : ''}, ${draftCount} draft${draftCount !== 1 ? 's' : ''} — ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // Build body sections (only include non-empty)
  let bodyHtml = '';

  // Overdue tasks (red)
  bodyHtml += buildSection(
    'Overdue Tasks',
    '#ef4444',
    data.overdueTasks.slice(0, 5).map(taskItem),
    data.overdueTasks.length
  );

  // Today's tasks (amber)
  bodyHtml += buildSection(
    "Today's Tasks",
    '#f59e0b',
    data.todayTasks.slice(0, 5).map(taskItem),
    data.todayTasks.length
  );

  // Draft proposals (blue)
  bodyHtml += buildSection(
    'Draft Proposals',
    '#3b82f6',
    data.draftProposals.slice(0, 5).map(draftItem),
    data.draftProposals.length
  );

  // Upcoming trips (green)
  bodyHtml += buildSection(
    'Upcoming Trips',
    '#10b981',
    data.upcomingTrips.slice(0, 5).map(tripItem),
    data.upcomingTrips.length
  );

  // Triggered reminders (purple)
  bodyHtml += buildSection(
    'Admin Reminders',
    '#8b5cf6',
    data.triggeredReminders.slice(0, 5).map(reminderItem),
    data.triggeredReminders.length
  );

  // CTA button
  bodyHtml += ctaButton(brand, 'View Today\'s Priorities', `${BASE_URL}/admin/today`);

  const html = emailShell(brand, 'Daily Digest', dateStr, bodyHtml);

  // Plain text version
  const textParts: string[] = [`Daily Digest — ${dateStr}\n`];

  if (data.overdueTasks.length > 0) {
    textParts.push(`\nOVERDUE TASKS (${data.overdueTasks.length}):`);
    data.overdueTasks.slice(0, 5).forEach(t => textParts.push(`  - ${t.title} (Due: ${t.due_date})`));
  }
  if (data.todayTasks.length > 0) {
    textParts.push(`\nTODAY'S TASKS (${data.todayTasks.length}):`);
    data.todayTasks.slice(0, 5).forEach(t => textParts.push(`  - ${t.title}`));
  }
  if (data.draftProposals.length > 0) {
    textParts.push(`\nDRAFT PROPOSALS (${data.draftProposals.length}):`);
    data.draftProposals.slice(0, 5).forEach(d => textParts.push(`  - ${d.customer_name} (${d.proposal_number})`));
  }
  if (data.upcomingTrips.length > 0) {
    textParts.push(`\nUPCOMING TRIPS (${data.upcomingTrips.length}):`);
    data.upcomingTrips.slice(0, 5).forEach(t => textParts.push(`  - ${t.customer_name} — ${t.start_date}`));
  }
  if (data.triggeredReminders.length > 0) {
    textParts.push(`\nADMIN REMINDERS (${data.triggeredReminders.length}):`);
    data.triggeredReminders.slice(0, 5).forEach(r => textParts.push(`  - ${r.message}`));
  }

  textParts.push(`\nView Today's Priorities: ${BASE_URL}/admin/today`);

  return { subject, html, text: textParts.join('\n') };
}
