/**
 * GitHub Issue Creation Utility
 *
 * Shared utility for creating and deduplicating GitHub issues.
 * Used by Sentry webhook handler, CI failure steps, and morning briefing.
 */

import { logger } from '@/lib/logger';

interface CreateIssueParams {
  title: string;
  body: string;
  labels: string[];
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  labels: Array<{ name: string }>;
}

interface FindIssueParams {
  labels: string[];
  titleContains?: string;
}

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY; // format: owner/repo

  if (!token || !repository) {
    return null;
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    return null;
  }

  return { token, owner, repo };
}

/**
 * Find an existing open issue matching the given labels and optional title substring.
 * Returns the first matching issue, or null if none found.
 */
export async function findOpenIssue(
  params: FindIssueParams
): Promise<GitHubIssue | null> {
  const config = getConfig();
  if (!config) {
    logger.warn('[GitHub] GITHUB_TOKEN or GITHUB_REPOSITORY not configured — skipping issue search');
    return null;
  }

  const { token, owner, repo } = config;
  const labelsParam = params.labels.join(',');

  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&labels=${encodeURIComponent(labelsParam)}&per_page=100`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    logger.error('[GitHub] Failed to search issues', {
      status: response.status,
      statusText: response.statusText,
    });
    return null;
  }

  const issues: GitHubIssue[] = await response.json();

  if (params.titleContains) {
    const needle = params.titleContains.toLowerCase();
    return issues.find((issue) => issue.title.toLowerCase().includes(needle)) ?? null;
  }

  return issues[0] ?? null;
}

/**
 * Create a GitHub issue. Returns the created issue, or null on failure.
 * Does NOT perform dedup — call findOpenIssue first if dedup is needed.
 */
export async function createGitHubIssue(
  params: CreateIssueParams
): Promise<GitHubIssue | null> {
  const config = getConfig();
  if (!config) {
    logger.warn('[GitHub] GITHUB_TOKEN or GITHUB_REPOSITORY not configured — skipping issue creation');
    return null;
  }

  const { token, owner, repo } = config;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        labels: params.labels,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    logger.error('[GitHub] Failed to create issue', {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    });
    return null;
  }

  const issue: GitHubIssue = await response.json();
  logger.info('[GitHub] Issue created', {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
  });

  return issue;
}
