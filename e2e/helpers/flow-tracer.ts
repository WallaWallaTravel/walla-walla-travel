/**
 * Shared helpers for integration flow tests.
 *
 * These utilities reduce boilerplate when writing end-to-end tests
 * that trace a complete business workflow (e.g., proposal -> booking).
 */
import { Page, expect } from '@playwright/test';

/** Wait for a page to finish loading (loading text hidden) */
export async function waitForPageLoad(page: Page, loadingText = 'Loading', timeout = 45_000) {
  const loader = page.getByText(new RegExp(loadingText, 'i')).first();
  if (await loader.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(loader).toBeHidden({ timeout });
  }
}

/** Navigate to admin page and wait for load */
export async function goToAdmin(page: Page, path: string) {
  await page.goto(`/admin/${path}`, { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
}

/** Get CSRF token from cookie or meta tag */
export async function getCsrfToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const csrf = cookies.find(c => c.name === 'csrf_token');
  return csrf?.value || null;
}

/** Standard API response shape */
export interface ApiResponse {
  success: boolean;
  data: Record<string, unknown>;
  message?: string;
  [key: string]: unknown;
}

/** Assert that a JSON API response has { success: true } and return typed body */
export async function expectApiSuccess(response: { ok: () => boolean; json: () => Promise<Record<string, unknown>> }): Promise<ApiResponse> {
  expect(response.ok()).toBe(true);
  const body = await response.json() as ApiResponse;
  expect(body).toHaveProperty('success', true);
  return body;
}

/** Navigate to proposal detail page and wait for it to load */
export async function goToProposal(page: Page, proposalId: number) {
  await goToAdmin(page, `trip-proposals/${proposalId}`);
  await waitForPageLoad(page);
}

/** Generate a future date string in YYYY-MM-DD format */
export function futureDate(daysFromNow = 30): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}
