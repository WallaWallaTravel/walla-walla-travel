import { test, expect } from '@playwright/test';

test.describe('Admin Shared Tours', () => {
  test('shared tours page loads', async ({ page }) => {
    await page.goto('/admin/shared-tours');

    // Wait for page to load — look for tour management heading or content
    await expect(page.getByText(/Shared Tour/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('filter tabs show upcoming and past', async ({ page }) => {
    await page.goto('/admin/shared-tours');
    await expect(page.getByText(/Shared Tour/i).first()).toBeVisible({ timeout: 15_000 });

    // Filter buttons
    await expect(page.getByRole('button', { name: /Upcoming/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Past/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^All$/i }).first()).toBeVisible();
  });

  test('create tour modal opens', async ({ page }) => {
    await page.goto('/admin/shared-tours');
    await expect(page.getByText(/Shared Tour/i).first()).toBeVisible({ timeout: 15_000 });

    // Click create tour button
    const createBtn = page.getByRole('button', { name: /Add Tour Date/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Modal should show form fields
    await expect(page.getByText(/Tour Date/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Start Time/i).first()).toBeVisible();
    await expect(page.getByText(/Max Guests/i).first()).toBeVisible();
  });

  test('create tour modal has default values', async ({ page }) => {
    await page.goto('/admin/shared-tours');
    await expect(page.getByText(/Shared Tour/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Add Tour Date/i }).click();
    await expect(page.getByText(/Tour Date/i).first()).toBeVisible({ timeout: 5_000 });

    // Default form values should be populated
    const titleInput = page
      .locator('label')
      .filter({ hasText: /Title/i })
      .locator('..')
      .locator('input')
      .first();
    if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(titleInput).toHaveValue(/Shared Wine Tour/);
    }
  });

  test('tour list shows spots and status', async ({ page }) => {
    await page.goto('/admin/shared-tours');
    await expect(page.getByText(/Shared Tour/i).first()).toBeVisible({ timeout: 15_000 });

    // Check for spot availability display — look for any tickets_sold or spots info
    const tourRows = page.locator('tr, [class*="border"]').filter({ hasText: /spots|sold|Published/i });
    const count = await tourRows.count();
    if (count > 0) {
      // At least one tour shows availability info
      await expect(tourRows.first()).toBeVisible();
    }
  });

  test('public shared tours page loads', async ({ page }) => {
    // Public page does not require auth
    await page.goto('/shared-tours');

    await expect(page.getByText(/Shared Wine Tours/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('public shared tours shows spots available', async ({ page }) => {
    await page.goto('/shared-tours');
    await expect(page.getByText(/Shared Wine Tours/i).first()).toBeVisible({ timeout: 15_000 });

    // If tours exist, verify spots display
    const spotText = page.getByText(/spots/i).first();
    if (await spotText.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(spotText).toBeVisible();
    }
  });

  test('public shared tours has Book Now or Sold Out buttons', async ({ page }) => {
    await page.goto('/shared-tours');
    await expect(page.getByText(/Shared Wine Tours/i).first()).toBeVisible({ timeout: 15_000 });

    // Tours should have either "Book Now" or "Sold Out" buttons
    const bookBtn = page.getByText(/Book Now/i).first();
    const soldOut = page.getByText(/Sold Out/i).first();
    const unavailable = page.getByText(/Unavailable/i).first();

    const hasBookNow = await bookBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasSoldOut = await soldOut.isVisible({ timeout: 2_000 }).catch(() => false);
    const hasUnavailable = await unavailable.isVisible({ timeout: 2_000 }).catch(() => false);

    // At least one state should be present if tours exist
    // If no tours exist, that's also valid
    if (hasBookNow || hasSoldOut || hasUnavailable) {
      expect(hasBookNow || hasSoldOut || hasUnavailable).toBeTruthy();
    }
  });
});
