import { test, expect } from '@playwright/test';

/**
 * Admin Guest Management Tests
 *
 * Tests the Guests tab in the admin trip proposal editor.
 * Uses stored admin auth (depends on auth setup).
 */

test.describe('Admin Guest Management', () => {
  let proposalUrl: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });
    const page = await context.newPage();

    try {
      await page.goto('/admin/trip-proposals');
      await expect(page.getByRole('heading', { name: /Proposals/i }).first()).toBeVisible({
        timeout: 15_000,
      });

      const firstLink = page.locator('a[href*="/admin/trip-proposals/"]').first();
      if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        const href = await firstLink.getAttribute('href');
        if (href) {
          proposalUrl = href;
        }
      }
    } catch (e) {
      console.warn('Could not find test proposal for guest management tests:', e);
    } finally {
      await context.close();
    }
  });

  test('guests tab loads with settings card', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    const guestsTab = page.getByRole('button', { name: /Guests/i });
    await expect(guestsTab).toBeVisible({ timeout: 10_000 });
    await guestsTab.click();

    await expect(page.getByText('Guest Settings')).toBeVisible({ timeout: 5000 });
  });

  test('guest settings has capacity fields', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Guests/i }).click();
    await expect(page.getByText('Guest Settings')).toBeVisible({ timeout: 5000 });

    await expect(page.getByText('Max Guests (capacity)')).toBeVisible();
    await expect(page.getByText('Min Guests (threshold)')).toBeVisible();
    await expect(page.getByText('Min Guests Deadline')).toBeVisible();
  });

  test('guest settings has toggles', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Guests/i }).click();
    await expect(page.getByText('Guest Settings')).toBeVisible({ timeout: 5000 });

    await expect(page.getByText('Dynamic Pricing')).toBeVisible();
    await expect(page.getByText('Show Guest Count to Guests')).toBeVisible();
    await expect(page.getByText('Require Approval')).toBeVisible();
  });

  test('max guests setting is editable', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Guests/i }).click();
    await expect(page.getByText('Guest Settings')).toBeVisible({ timeout: 5000 });

    const maxInput = page
      .locator('label')
      .filter({ hasText: /Max Guests/i })
      .locator('..')
      .locator('input[type="number"]')
      .first();

    await maxInput.fill('20');
    await maxInput.blur();
    await page.waitForTimeout(1500);

    // Reload and verify persistence
    await page.reload();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Guests/i }).click();
    await expect(page.getByText('Guest Settings')).toBeVisible({ timeout: 5000 });

    const refreshedInput = page
      .locator('label')
      .filter({ hasText: /Max Guests/i })
      .locator('..')
      .locator('input[type="number"]')
      .first();
    await expect(refreshedInput).toHaveValue('20');
  });

  test('invite link is visible and has correct format', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Guests/i }).click();
    await expect(page.getByText('Guest Settings')).toBeVisible({ timeout: 5000 });

    const inviteLinkInput = page.locator('input[readonly]').first();
    await expect(inviteLinkInput).toBeVisible({ timeout: 5000 });

    const linkValue = await inviteLinkInput.inputValue();
    expect(linkValue).toContain('/my-trip/');
    expect(linkValue).toContain('/join');

    const copyBtn = page.getByRole('button', { name: /Copy Link/i }).first();
    await expect(copyBtn).toBeVisible();
  });

  test('add guest modal opens and has required fields', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Guests/i }).click();
    await page.waitForTimeout(1000);

    const addGuestBtn = page.getByRole('button', { name: /Add Guest/i });
    await expect(addGuestBtn).toBeVisible({ timeout: 5000 });
    await addGuestBtn.click();

    await expect(page.getByRole('heading', { name: /Add Guest/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByPlaceholder('Full name')).toBeVisible();
    await expect(page.getByPlaceholder('guest@example.com')).toBeVisible();
  });

  test('add guest with test data', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Guests/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /Add Guest/i }).click();
    await expect(page.getByRole('heading', { name: /Add Guest/i })).toBeVisible({ timeout: 3000 });

    const timestamp = Date.now();
    await page.getByPlaceholder('Full name').fill(`E2E Test Guest ${timestamp}`);
    await page.getByPlaceholder('guest@example.com').fill(`e2e-admin-guest-${timestamp}@example.com`);

    const addBtn = page.getByRole('button', { name: /Add Guest/i }).last();
    await addBtn.click();

    await page.waitForTimeout(2000);
    await expect(page.getByText(`E2E Test Guest ${timestamp}`)).toBeVisible({ timeout: 5000 });
  });

  test('guest list shows guest details', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Guests/i }).click();
    await page.waitForTimeout(1000);

    const guestCards = page.locator('.border-2.rounded-lg');

    if (await guestCards.count() > 0) {
      const firstCard = guestCards.first();
      await expect(firstCard).toBeVisible();
      await expect(firstCard.getByText(/Email:/i)).toBeVisible();
      await expect(firstCard.getByText(/Phone:/i)).toBeVisible();
    }
  });

  test('require approval toggle works', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Guests/i }).click();
    await expect(page.getByText('Require Approval')).toBeVisible({ timeout: 5000 });

    const approvalCheckbox = page
      .locator('label')
      .filter({ hasText: /Require Approval/i })
      .locator('input[type="checkbox"]');

    const isChecked = await approvalCheckbox.isChecked();
    await approvalCheckbox.click();
    await page.waitForTimeout(1500);

    const newState = await approvalCheckbox.isChecked();
    expect(newState).toBe(!isChecked);

    // Toggle back to not affect other tests
    await approvalCheckbox.click();
    await page.waitForTimeout(1500);
  });

  test('registered guest count is displayed', async ({ page }) => {
    test.skip(!proposalUrl, 'No test proposal available');

    await page.goto(proposalUrl!);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Guests/i }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/guest.*registered|guests registered/i).first()).toBeVisible({
      timeout: 5000,
    });
  });
});
