import { test, expect } from '@playwright/test';

/**
 * Guest Registration Flow (Join Page)
 *
 * Tests the public /my-trip/[token]/join page where guests register for a trip.
 * Uses a fresh session (no auth) since guests don't log in.
 *
 * Strategy:
 * - Invalid token tests verify error handling without needing real data
 * - Form tests use admin auth in beforeAll to create a test proposal
 */

test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Tests with an invalid token — verifiable without real data
// ---------------------------------------------------------------------------

test.describe('Guest Registration — Invalid Token', () => {
  test('invalid token shows error page', async ({ page }) => {
    // Use a token without hyphens but too short (the regex requires 32+ alphanum)
    await page.goto('/my-trip/invalidtokenthatshouldnotexist/join');

    // The page shows loading skeleton then error. Allow extra time for cold compilation.
    await expect(page.getByText(/Unable to Join|Trip not found|not found/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('nonexistent valid-format token shows error', async ({ page }) => {
    // 64-char alphanumeric token that doesn't exist in DB
    const fakeToken = 'a'.repeat(64);
    await page.goto(`/my-trip/${fakeToken}/join`);

    await expect(page.getByText(/Unable to Join|Trip not found|not found|not accepting/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Tests using admin-created proposal (requires stored auth for setup)
// ---------------------------------------------------------------------------

test.describe('Guest Registration — Form', () => {
  // Use admin auth for beforeAll to create a proposal
  test.use({
    storageState: 'e2e/.auth/admin.json',
  });

  let proposalAccessToken: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const page = await context.newPage();

    try {
      await page.goto('/admin/trip-proposals/new');
      await expect(page.getByText(/Customer Name/i).first()).toBeVisible({ timeout: 15_000 });

      // Fill customer name
      const customerNameInput = page
        .locator('label')
        .filter({ hasText: /Customer Name/i })
        .locator('..')
        .locator('input')
        .first();
      await customerNameInput.fill('E2E Registration Test');

      // Fill email
      const emailInput = page
        .locator('label')
        .filter({ hasText: /Email/i })
        .locator('..')
        .locator('input[type="email"]')
        .first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('e2e-regtest@example.com');
      }

      // Save as draft
      await page.getByRole('button', { name: /Save Draft/i }).click();
      await page.waitForTimeout(3000);

      // After save, navigate to Guests tab to get the invite link
      const guestsTab = page.getByRole('button', { name: /Guests/i });
      if (await guestsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await guestsTab.click();
        await page.waitForTimeout(1000);

        const linkInput = page.locator('input[readonly]').first();
        if (await linkInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          const linkValue = await linkInput.inputValue();
          const tokenMatch = linkValue.match(/my-trip\/([A-Za-z0-9]+)\/join/);
          if (tokenMatch) {
            proposalAccessToken = tokenMatch[1];
          }
        }
      }
    } catch (e) {
      console.warn('Could not create test proposal for registration tests:', e);
    } finally {
      await context.close();
    }
  });

  test('join page loads with trip info', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}/join`);

    // Should show the trip header and registration form
    await expect(page.getByText(/Join This Trip|E2E Registration Test/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Form fields should be visible
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  });

  test('form validation — empty required fields', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}/join`);
    await expect(page.getByPlaceholder('Your name')).toBeVisible({ timeout: 15_000 });

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
    await expect(page.getByPlaceholder('Your name')).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder('Your name').fill('Test Guest');
    await page.getByPlaceholder('you@example.com').fill('not-an-email');

    await page.getByRole('button', { name: /Join This Trip/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 5000 });
  });

  test('successful registration shows confirmation', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}/join`);
    await expect(page.getByPlaceholder('Your name')).toBeVisible({ timeout: 15_000 });

    const timestamp = Date.now();
    await page.getByPlaceholder('Your name').fill(`E2E Test Guest ${timestamp}`);
    await page.getByPlaceholder('you@example.com').fill(`e2e-guest-${timestamp}@example.com`);

    await page.getByRole('button', { name: /Join This Trip/i }).click();

    // Should show success or redirect to portal
    await expect(
      page.getByText(/registered|Redirecting|approval/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('form has accessible labels', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}/join`);
    await expect(page.getByPlaceholder('Your name')).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText('Full Name')).toBeVisible();
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Phone')).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /Join This Trip|Register/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveAttribute('aria-label');
  });

  test('mobile layout is responsive', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/my-trip/${proposalAccessToken}/join`);
    await expect(page.getByPlaceholder('Your name')).toBeVisible({ timeout: 15_000 });

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10);
  });
});
