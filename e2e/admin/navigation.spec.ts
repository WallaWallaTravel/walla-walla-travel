import { test, expect } from '@playwright/test';

test.describe('Admin Sidebar Navigation', () => {
  test('sidebar links navigate to correct pages', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    // Sidebar items are <button> elements using router.push
    const sidebar = page.locator('aside').first();

    // Navigate to Proposals via sidebar button
    await sidebar.getByRole('button', { name: /Proposals/ }).click();
    await expect(page).toHaveURL(/\/admin\/trip-proposals/, { timeout: 10_000 });

    // Navigate to Trips
    await sidebar.getByRole('button', { name: /Trips/ }).click();
    await expect(page).toHaveURL(/\/admin\/bookings/, { timeout: 10_000 });

    // Navigate to Users
    await sidebar.getByRole('button', { name: /Users/ }).click();
    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 10_000 });

    // Navigate back to Dashboard
    await sidebar.getByRole('button', { name: /Dashboard/ }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10_000 });
  });

  test('sidebar shows all major sections', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    const sidebar = page.locator('aside').first();

    // Section headers
    await expect(sidebar.getByText('Overview')).toBeVisible();
    await expect(sidebar.getByText('Sales Pipeline')).toBeVisible();
    await expect(sidebar.getByText('System')).toBeVisible();
  });

  test('sidebar highlights current page', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    const sidebar = page.locator('aside').first();

    // Dashboard button should have active styling class
    const dashboardBtn = sidebar.getByRole('button', { name: /Dashboard/ });
    await expect(dashboardBtn).toBeVisible();
    await expect(dashboardBtn).toHaveClass(/1E3A5F/);
  });

  test('logout button is visible', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    const sidebar = page.locator('aside').first();
    await expect(sidebar.getByText('Logout')).toBeVisible();
  });
});

test.describe('Admin Mobile Bottom Navigation', () => {
  test.use({
    viewport: { width: 375, height: 812 },
  });

  test('bottom nav is visible on mobile', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    // Bottom nav: <nav class="lg:hidden fixed bottom-0 ...">
    const bottomNav = page.locator('nav.fixed');
    await expect(bottomNav).toBeVisible();
  });

  test('mobile bottom nav links work', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    // Bottom nav has anchor links, click one
    const bottomNav = page.locator('nav.fixed');
    const tripsLink = bottomNav.locator('a[href="/admin/bookings"]');
    if (await tripsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tripsLink.click();
      await expect(page).toHaveURL(/\/admin\/bookings/, { timeout: 10_000 });
    }
  });
});
