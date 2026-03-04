import { test, expect } from '@playwright/test';

// Login tests don't use stored auth — start fresh
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Admin Login', () => {
  test('successful login redirects to dashboard with sidebar visible', async ({ page }) => {
    await page.goto('/login?portal=admin');

    await page.locator('#email').fill('info@wallawalla.travel');
    await page.locator('#password').fill('wwtRynMdsn03');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should redirect to admin dashboard
    await page.waitForURL('**/admin/dashboard', { timeout: 15_000 });

    // Dashboard content should be visible
    await expect(page.getByText(/Welcome back/)).toBeVisible();

    // Sidebar should be visible (desktop)
    await expect(page.getByText('Admin Portal')).toBeVisible();
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login?portal=admin');

    await page.locator('#email').fill('wrong@example.com');
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Error alert should appear
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  });

  test('empty form shows validation feedback', async ({ page }) => {
    await page.goto('/login?portal=admin');

    // Click sign in without filling fields — browser validation should prevent submission
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login?portal=admin');

    // Form elements should be present
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
