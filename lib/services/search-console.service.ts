/**
 * Google Search Console Service
 *
 * @module lib/services/search-console.service
 * @description Handles Google Search Console OAuth authentication and data retrieval.
 * Uses the Search Console API v3 (REST) to pull search performance data
 * including queries, page performance, impressions, clicks, CTR, and position.
 *
 * Tokens are stored in the `integrations` table with service = 'google_search_console'.
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Search Console API endpoint
const SEARCH_ANALYTICS_BASE = 'https://searchconsole.googleapis.com/webmasters/v3/sites';

// Required scope for Search Console read access
const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

// Types

export interface SearchConsoleQuery {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface SearchConsolePagePerformance {
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
  responseAggregationType?: string;
}

interface IntegrationRecord {
  id: number;
  service: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  last_sync_at: string | null;
  last_error: string | null;
}

// Helper functions

function getClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID environment variable not set');
  return clientId;
}

function getClientSecret(): string {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientSecret) throw new Error('GOOGLE_CLIENT_SECRET environment variable not set');
  return clientSecret;
}

function getSiteUrl(): string {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
  if (!siteUrl) throw new Error('GOOGLE_SEARCH_CONSOLE_SITE_URL environment variable not set');
  return siteUrl;
}

// OAuth Methods

/**
 * Generate the Google OAuth authorization URL for Search Console
 */
export function generateAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SEARCH_CONSOLE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens
 */
export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Google OAuth token exchange failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data: GoogleTokenResponse = await response.json();

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresAt,
  };
}

// Token Storage Methods

/**
 * Store OAuth tokens in the integrations table
 */
export async function storeTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
): Promise<void> {
  await query(
    `INSERT INTO integrations (service, access_token_encrypted, refresh_token_encrypted, token_expires_at, scopes, is_active)
     VALUES ('google_search_console', $1, $2, $3, $4, true)
     ON CONFLICT (service) DO UPDATE SET
       access_token_encrypted = $1,
       refresh_token_encrypted = CASE WHEN $2 = '' THEN integrations.refresh_token_encrypted ELSE $2 END,
       token_expires_at = $3,
       scopes = $4,
       is_active = true,
       last_error = NULL,
       updated_at = NOW()`,
    [accessToken, refreshToken, expiresAt.toISOString(), [SEARCH_CONSOLE_SCOPE]]
  );
}

/**
 * Retrieve stored integration record
 */
export async function getIntegration(): Promise<IntegrationRecord | null> {
  const result = await query<IntegrationRecord>(
    `SELECT * FROM integrations WHERE service = 'google_search_console' AND is_active = true`
  );
  return result.rows[0] || null;
}

/**
 * Refresh the access token using the stored refresh token
 */
export async function refreshAccessToken(): Promise<string> {
  const integration = await getIntegration();
  if (!integration?.refresh_token_encrypted) {
    throw new Error('No refresh token stored for Google Search Console');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: integration.refresh_token_encrypted,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Google OAuth token refresh failed', {
      status: response.status,
      error: errorText,
    });

    await query(
      `UPDATE integrations SET last_error = $1, updated_at = NOW() WHERE service = 'google_search_console'`,
      [`Token refresh failed: ${response.status}`]
    );

    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data: GoogleTokenResponse = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await storeTokens(data.access_token, data.refresh_token || '', expiresAt);

  return data.access_token;
}

/**
 * Get a valid access token, refreshing if expired
 */
export async function getValidAccessToken(): Promise<string> {
  const integration = await getIntegration();
  if (!integration) {
    throw new Error('Google Search Console integration not configured');
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at)
    : new Date(0);

  const bufferMs = 5 * 60 * 1000;
  if (expiresAt.getTime() - bufferMs > Date.now() && integration.access_token_encrypted) {
    return integration.access_token_encrypted;
  }

  return refreshAccessToken();
}

// Data Pull Methods

/**
 * Get top search queries with performance metrics
 */
export async function getTopQueries(
  startDate: string,
  endDate: string,
  limit: number = 100
): Promise<SearchConsoleQuery[]> {
  const accessToken = await getValidAccessToken();
  const siteUrl = getSiteUrl();
  const encodedSiteUrl = encodeURIComponent(siteUrl);

  const response = await fetch(
    `${SEARCH_ANALYTICS_BASE}/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: limit,
        dataState: 'final',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Search Console API query failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`Search Console API error: ${response.status}`);
  }

  const data: SearchAnalyticsResponse = await response.json();

  return (data.rows || []).map((row) => ({
    query: row.keys[0],
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: Math.round(row.ctr * 10000) / 10000,
    position: Math.round(row.position * 100) / 100,
  }));
}

/**
 * Get page performance metrics
 */
export async function getPagePerformance(
  startDate: string,
  endDate: string
): Promise<SearchConsolePagePerformance[]> {
  const accessToken = await getValidAccessToken();
  const siteUrl = getSiteUrl();
  const encodedSiteUrl = encodeURIComponent(siteUrl);

  const response = await fetch(
    `${SEARCH_ANALYTICS_BASE}/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 500,
        dataState: 'final',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Search Console page performance API call failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`Search Console API error: ${response.status}`);
  }

  const data: SearchAnalyticsResponse = await response.json();

  return (data.rows || []).map((row) => ({
    page: row.keys[0],
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: Math.round(row.ctr * 10000) / 10000,
    position: Math.round(row.position * 100) / 100,
  }));
}

/**
 * Sync yesterday's data into the search_console_data table.
 * Pulls both query-level and page-level data for the previous day.
 */
export async function syncDailyData(): Promise<{
  queriesStored: number;
  pagesStored: number;
  date: string;
}> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  logger.info('Starting Search Console daily sync', { date: dateStr });

  const accessToken = await getValidAccessToken();
  const siteUrl = getSiteUrl();
  const encodedSiteUrl = encodeURIComponent(siteUrl);

  // Pull query + page combined data for granular storage
  const response = await fetch(
    `${SEARCH_ANALYTICS_BASE}/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: dateStr,
        endDate: dateStr,
        dimensions: ['query', 'page'],
        rowLimit: 5000,
        dataState: 'final',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    const errorMsg = `Search Console sync API error: ${response.status}`;
    logger.error(errorMsg, { error: errorText });

    await query(
      `UPDATE integrations SET last_error = $1, updated_at = NOW() WHERE service = 'google_search_console'`,
      [errorMsg]
    );

    throw new Error(errorMsg);
  }

  const data: SearchAnalyticsResponse = await response.json();
  const rows = data.rows || [];

  let queriesStored = 0;
  let pagesStored = 0;

  // Batch insert rows using upsert
  for (const row of rows) {
    const queryText = row.keys[0];
    const pageUrl = row.keys[1];

    await query(
      `INSERT INTO search_console_data (data_date, page_url, query, impressions, clicks, ctr, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (data_date, page_url, COALESCE(query, ''), country, device)
       DO UPDATE SET
         impressions = $4,
         clicks = $5,
         ctr = $6,
         position = $7`,
      [
        dateStr,
        pageUrl,
        queryText,
        row.impressions,
        row.clicks,
        Math.round(row.ctr * 10000) / 10000,
        Math.round(row.position * 100) / 100,
      ]
    );

    queriesStored++;
  }

  // Also pull page-level aggregated data (without query dimension)
  const pageResponse = await fetch(
    `${SEARCH_ANALYTICS_BASE}/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: dateStr,
        endDate: dateStr,
        dimensions: ['page'],
        rowLimit: 1000,
        dataState: 'final',
      }),
    }
  );

  if (pageResponse.ok) {
    const pageData: SearchAnalyticsResponse = await pageResponse.json();
    const pageRows = pageData.rows || [];

    for (const row of pageRows) {
      const pageUrl = row.keys[0];

      await query(
        `INSERT INTO search_console_data (data_date, page_url, query, impressions, clicks, ctr, position)
         VALUES ($1, $2, NULL, $3, $4, $5, $6)
         ON CONFLICT (data_date, page_url, COALESCE(query, ''), country, device)
         DO UPDATE SET
           impressions = $3,
           clicks = $4,
           ctr = $5,
           position = $6`,
        [
          dateStr,
          pageUrl,
          row.impressions,
          row.clicks,
          Math.round(row.ctr * 10000) / 10000,
          Math.round(row.position * 100) / 100,
        ]
      );

      pagesStored++;
    }
  }

  // Update last sync time and clear errors
  await query(
    `UPDATE integrations SET last_sync_at = NOW(), last_error = NULL, updated_at = NOW()
     WHERE service = 'google_search_console'`,
  );

  logger.info('Search Console daily sync completed', {
    date: dateStr,
    queriesStored,
    pagesStored,
  });

  return { queriesStored, pagesStored, date: dateStr };
}
