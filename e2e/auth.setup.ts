import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login?portal=admin');

  // Fill login form
  await page.locator('#email').fill('info@wallawalla.travel');
  await page.locator('#password').fill('wwtRynMdsn03');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect to admin dashboard
  await page.waitForURL('**/admin/dashboard', { timeout: 45_000 });
  await expect(page.getByText(/Welcome back/)).toBeVisible();

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});
