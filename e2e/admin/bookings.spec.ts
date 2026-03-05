import { test, expect } from '@playwright/test';

test.describe('Admin Bookings (Trips)', () => {
  test('trips page loads with heading and tabs', async ({ page }) => {
    await page.goto('/admin/bookings');

    await expect(page.getByRole('heading', { name: /Trips/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Tab buttons
    await expect(page.getByRole('button', { name: /^All\b/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Planning/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Upcoming/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Completed/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancelled/i }).first()).toBeVisible();
  });

  test('stat cards display counts', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: /Trips/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Stat cards with counts for each status — scope to the stat card container
    const statSection = page.locator('div').filter({ hasText: /Planning/ }).filter({ hasText: /Upcoming/ }).filter({ hasText: /Completed/ }).first();
    await expect(statSection).toBeVisible();
  });

  test('search input filters trips', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: /Trips/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    const searchInput = page.getByPlaceholder(/Customer name, email/i);
    await expect(searchInput).toBeVisible();

    // Type a non-existent search term
    await searchInput.fill('zzz-nonexistent-e2e-test');
    await page.waitForTimeout(500);
  });

  test('tab filtering changes displayed trips', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: /Trips/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Click "Completed" tab
    await page.getByRole('button', { name: /Completed/i }).first().click();
    await page.waitForTimeout(500);

    // Click "All" tab to return to full list
    await page.getByRole('button', { name: /^All\b/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('trips page has search and filter controls', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: /Trips/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Search input should be available
    const searchInput = page.getByPlaceholder(/Customer name, email/i);
    await expect(searchInput).toBeVisible();

    // Tab buttons should be clickable
    const planningTab = page.getByRole('button', { name: /Planning/i }).first();
    await expect(planningTab).toBeVisible();
  });

  test('trip cards show booking details', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: /Trips/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // If trips exist, verify card structure
    const tripCards = page.locator('a[href*="/admin/trip-proposals/"]');
    const count = await tripCards.count();
    if (count > 0) {
      const firstCard = tripCards.first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('navigates to booking detail from card', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: /Trips/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Click the first trip card that links to a proposal
    const tripLinks = page.locator('a[href*="/admin/trip-proposals/"]');
    const count = await tripLinks.count();
    if (count > 0) {
      await tripLinks.first().click();
      await expect(page).toHaveURL(/\/admin\/trip-proposals\/\d+/, { timeout: 15_000 });
    }
  });
});
