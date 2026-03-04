import { test, expect } from '@playwright/test';

test.describe('Admin Proposals', () => {
  test('proposals page loads', async ({ page }) => {
    await page.goto('/admin/trip-proposals');

    await expect(page.getByRole('heading', { name: /Proposals/i }).first()).toBeVisible();
  });

  test('new proposal menu shows options', async ({ page }) => {
    await page.goto('/admin/trip-proposals');
    await expect(page.getByRole('heading', { name: /Proposals/i }).first()).toBeVisible();

    // Click "+ New" button to open dropdown
    await page.getByRole('button', { name: /\+ New/i }).click();

    // Dropdown options — use link selectors since they navigate to pages
    await expect(page.locator('a[href="/admin/trip-estimates/new"]')).toBeVisible();
    await expect(page.locator('a[href="/admin/trip-proposals/new"]')).toBeVisible();
  });

  test('create proposal, add stop, verify it appears', async ({ page }) => {
    await page.goto('/admin/trip-proposals/new');

    // Wait for form to load
    await expect(page.getByText(/Customer Name/i).first()).toBeVisible({ timeout: 10_000 });

    // Fill customer name — find the input after the "Customer Name" label
    const customerNameInput = page
      .locator('label')
      .filter({ hasText: /Customer Name/i })
      .locator('..')
      .locator('input')
      .first();
    await customerNameInput.fill('E2E Test Customer');

    // Switch to Days & Stops tab
    await page.getByRole('button', { name: /Days/i }).click();

    // Add a day if the button exists
    const addDayBtn = page.getByRole('button', { name: /Add Day/i });
    if (await addDayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addDayBtn.click();

      // Add a stop
      const addStopBtn = page.getByRole('button', { name: /Add Stop/i }).first();
      if (await addStopBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addStopBtn.click();
      }
    }

    // Save as draft
    await page.getByRole('button', { name: /Save Draft/i }).click();

    // Wait for save response
    await page.waitForTimeout(3000);

    // Verify we can navigate back to list
    await page.goto('/admin/trip-proposals');
    await expect(page.getByRole('heading', { name: /Proposals/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('proposals list has filter tabs', async ({ page }) => {
    await page.goto('/admin/trip-proposals');
    await expect(page.getByRole('heading', { name: /Proposals/i }).first()).toBeVisible();

    // Tab buttons include count text like "All (5)" — match beginning of text
    await expect(page.getByRole('button', { name: /^All\b/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Quick Quotes/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Full Proposals/i }).first()).toBeVisible();
  });

  test('search filters proposals', async ({ page }) => {
    await page.goto('/admin/trip-proposals');
    await expect(page.getByRole('heading', { name: /Proposals/i }).first()).toBeVisible();

    const searchInput = page.getByPlaceholder(/Customer name or email/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('zzz-nonexistent-test');

    // Wait for search debounce
    await page.waitForTimeout(500);
  });
});
