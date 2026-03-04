/**
 * Sentry Issue Alert Handler
 *
 * Processes Sentry issue alert webhooks and creates GitHub issues.
 * Deduplicates by checking for existing open issues with the same error title.
 */

import { logger } from '@/lib/logger';
import { createGitHubIssue, findOpenIssue } from '@/lib/github/create-issue';

interface SentryIssueData {
  title: string;
  culprit: string;
  shortId: string;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
  };
  count: string;
  firstSeen: string;
  permalink: string;
  project: {
    slug: string;
    name: string;
  };
}

interface SentryIssueAlertPayload {
  action: string;
  data: {
    issue: SentryIssueData;
  };
  actor?: {
    type: string;
    name: string;
  };
}

const LABELS = ['sentry-error', 'auto-triage'];

/**
 * Handle a Sentry issue alert webhook.
 *
 * Creates a GitHub issue with error details, deduplicating against
 * existing open issues with the same labels and title.
 */
export async function handleSentryIssueAlert(
  payload: SentryIssueAlertPayload
): Promise<void> {
  const issue = payload.data?.issue;

  if (!issue) {
    logger.warn('[Sentry Handler] Payload missing issue data');
    return;
  }

  const errorTitle = issue.title || 'Unknown Sentry Error';

  // Dedup: check if there's already an open GitHub issue for this error
  const existing = await findOpenIssue({
    labels: LABELS,
    titleContains: errorTitle,
  });

  if (existing) {
    logger.info('[Sentry Handler] Duplicate issue found, skipping creation', {
      existingIssue: existing.number,
      errorTitle,
    });
    return;
  }

  const body = buildIssueBody(issue);

  const created = await createGitHubIssue({
    title: `[Sentry] ${errorTitle}`,
    body,
    labels: LABELS,
  });

  if (created) {
    logger.info('[Sentry Handler] GitHub issue created', {
      issueNumber: created.number,
      sentryId: issue.shortId,
    });
  }
}

function buildIssueBody(issue: SentryIssueData): string {
  const lines: string[] = [
    '## Sentry Error',
    '',
    `**Error:** ${issue.title}`,
  ];

  if (issue.culprit) {
    lines.push(`**Location:** \`${issue.culprit}\``);
  }

  if (issue.metadata?.type && issue.metadata?.value) {
    lines.push(`**Type:** ${issue.metadata.type}: ${issue.metadata.value}`);
  }

  if (issue.metadata?.filename) {
    lines.push(`**File:** \`${issue.metadata.filename}\``);
  }

  lines.push('');
  lines.push('## Details');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Project | ${issue.project?.name || 'unknown'} |`);
  lines.push(`| First Seen | ${issue.firstSeen || 'unknown'} |`);
  lines.push(`| Event Count | ${issue.count || 'unknown'} |`);
  lines.push(`| Sentry ID | ${issue.shortId || 'unknown'} |`);

  if (issue.permalink) {
    lines.push('');
    lines.push(`[View in Sentry](${issue.permalink})`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*Auto-created by Sentry webhook integration*');

  return lines.join('\n');
}
