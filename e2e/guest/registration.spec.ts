import { test, expect } from '@playwright/test';

/**
 * Guest Registration Flow (Join Page)
 *
 * Tests the public /my-trip/[token]/join page where guests register for a trip.
 * Uses a fresh session (no auth) since guests don't log in.
 *
 * Strategy:
 * - Invalid token tests verify error handling without needing real data
 * - Form tests use API-based beforeAll to get a proposal access token
 */

test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Tests with an invalid token — verifiable without real data
// ---------------------------------------------------------------------------

test.describe('Guest Registration — Invalid Token', () => {
  test('invalid token shows error page', async ({ page }) => {
    await page.goto('/my-trip/invalidtokenthatshouldnotexist/join');

    await expect(page.getByText(/Unable to Join|Trip not found|not found/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('nonexistent valid-format token shows error', async ({ page }) => {
    const fakeToken = 'a'.repeat(64);
    await page.goto(`/my-trip/${fakeToken}/join`);

    await expect(page.getByText(/Unable to Join|Trip not found|not found|not accepting/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Tests using admin API to find a proposal (fast, no browser nav)
// ---------------------------------------------------------------------------

test.describe('Guest Registration — Form', () => {
  test.describe.configure({ timeout: 60_000 });

  let proposalAccessToken: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4100';

    try {
      const response = await ctx.request.get(
        `${baseURL}/api/admin/trip-proposals?limit=1`
      );
      if (response.ok()) {
        const json = await response.json();
        const proposals = json.data?.proposals || [];
        if (proposals.length > 0 && proposals[0].access_token) {
          proposalAccessToken = proposals[0].access_token;
        }
      }
    } catch (err) {
      console.warn('[Registration beforeAll] Failed to fetch proposal:', err);
    } finally {
      await ctx.close();
    }
  });

  test('join page loads with trip info', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}/join`);

    await expect(page.getByText(/Join This Trip|Registration/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByPlaceholder(/name/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible();
  });

  test('form validation — empty required fields', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}/join`);
    await expect(page.getByPlaceholder(/name/i).first()).toBeVisible({ timeout: 15_000 });

    // Submit without filling anything
    await page.getByRole('button', { name: /Join This Trip/i }).click();

    // Validation errors should appear
    await expect(page.getByText(/Name is required/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Email is required/i)).toBeVisible({ timeout: 5000 });
  });

  test('form validation — invalid email format', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}/join`);
    await expect(page.getByPlaceholder(/name/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder(/name/i).first().fill('Test Guest');
    await page.getByPlaceholder(/email/i).first().fill('not-an-email');

    await page.getByRole('button', { name: /Join This Trip/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 5000 });
  });

  test('successful registration shows confirmation', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}/join`);
    await expect(page.getByPlaceholder(/name/i).first()).toBeVisible({ timeout: 15_000 });

    const timestamp = Date.now();
    await page.getByPlaceholder(/name/i).first().fill(`E2E Test Guest ${timestamp}`);
    await page.getByPlaceholder(/email/i).first().fill(`e2e-guest-${timestamp}@example.com`);

    await page.getByRole('button', { name: /Join This Trip/i }).click();

    // Should show success, payment step, or redirect to portal
    await expect(
      page.getByText(/registered|Redirecting|approval|deposit|payment/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('mobile layout is responsive', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/my-trip/${proposalAccessToken}/join`);
    await expect(page.getByPlaceholder(/name/i).first()).toBeVisible({ timeout: 15_000 });

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10);
  });
});
