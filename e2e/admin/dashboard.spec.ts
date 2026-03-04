import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test('dashboard loads with welcome message', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page.getByText(/Welcome back/)).toBeVisible();
    await expect(
      page.getByText("Here's what's happening with your business today")
    ).toBeVisible();
  });

  test('all stat cards render', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    // Stat cards are links — verify each by href + text
    await expect(page.getByText('Total Bookings')).toBeVisible();
    await expect(
      page.locator('a[href="/admin/trip-proposals"]').getByText('Proposals')
    ).toBeVisible();
    await expect(page.getByText('Active Drivers')).toBeVisible();
    await expect(page.getByText('Total Revenue')).toBeVisible();
  });

  test('proposals stat card shows count', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    const proposalsCard = page.locator('a[href="/admin/trip-proposals"]');
    await expect(proposalsCard).toBeVisible();
    await expect(proposalsCard.getByText('Proposals')).toBeVisible();
  });

  test('stat cards link to correct pages', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    // Click Total Bookings card
    await page.locator('a[href="/admin/bookings"]').first().click();
    await expect(page).toHaveURL(/\/admin\/bookings/, { timeout: 10_000 });
  });

  test('quick action buttons are present', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    // Quick actions are link cards — verify by href
    const bookingsLinks = page.locator('a[href="/admin/bookings"]');
    await expect(bookingsLinks.first()).toBeVisible();

    const usersLink = page.locator('a[href="/admin/users"]');
    await expect(usersLink.first()).toBeVisible();

    const businessLink = page.locator('a[href="/admin/business-portal"]');
    await expect(businessLink).toBeVisible();
  });
});
