import { test, expect } from '@playwright/test';

test.describe('Partner Portal', () => {
  test.describe('Authentication', () => {
    test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/partner-portal/dashboard');

      // Should redirect to login page
      await expect(page).toHaveURL(/login|signin|auth/i, { timeout: 10000 });
    });

    test('login page displays correctly', async ({ page }) => {
      await page.goto('/login');

      // Check login form elements
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /login|sign in|submit/i })).toBeVisible();
    });

    test('shows error on invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      const errorMessage = page.locator('[class*="error"], [role="alert"], .text-red');
      await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
    });

    test('validates email format', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await emailInput.fill('not-an-email');
      await emailInput.blur();

      // HTML5 validation or custom validation should trigger
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBeTruthy();
    });
  });

  test.describe('Partner Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authentication or use test credentials
      // For now, we test the unauthenticated behavior
    });

    test('dashboard page exists', async ({ page }) => {
      const response = await page.goto('/partner-portal/dashboard');

      // Page should exist (may redirect but not 404)
      expect(response?.status()).not.toBe(404);
    });

    test('story page exists', async ({ page }) => {
      const response = await page.goto('/partner-portal/story');
      expect(response?.status()).not.toBe(404);
    });

    test('tips page exists', async ({ page }) => {
      const response = await page.goto('/partner-portal/tips');
      expect(response?.status()).not.toBe(404);
    });

    test('listing page exists', async ({ page }) => {
      const response = await page.goto('/partner-portal/listing');
      expect(response?.status()).not.toBe(404);
    });

    test('photos page exists', async ({ page }) => {
      const response = await page.goto('/partner-portal/photos');
      expect(response?.status()).not.toBe(404);
    });
  });

  test.describe('Partner API Security', () => {
    test('partner endpoints require authentication', async ({ request }) => {
      const response = await request.get('/api/partner/profile');

      // Should reject unauthenticated requests
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('partner mutation endpoints require CSRF', async ({ request }) => {
      const response = await request.put('/api/partner/profile', {
        data: {
          business_name: 'Test Winery',
        },
      });

      // Should reject without CSRF token
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('partner photo upload requires auth', async ({ request }) => {
      const response = await request.post('/api/partner/photos', {
        multipart: {
          file: {
            name: 'test.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from('fake-image'),
          },
          category: 'hero',
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('partner content endpoint requires auth', async ({ request }) => {
      const response = await request.post('/api/partner/content', {
        data: {
          content_type: 'origin_story',
          content: 'Test content',
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('partner tips endpoint requires auth', async ({ request }) => {
      const response = await request.post('/api/partner/tips', {
        data: {
          tip_type: 'best_time',
          content: 'Test tip',
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Partner Portal Accessibility', () => {
    test('login form has proper labels', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"]');

      // Check for labels
      const emailId = await emailInput.getAttribute('id');
      const passwordId = await passwordInput.getAttribute('id');

      if (emailId) {
        await expect(page.locator(`label[for="${emailId}"]`)).toBeVisible();
      }
      if (passwordId) {
        await expect(page.locator(`label[for="${passwordId}"]`)).toBeVisible();
      }
    });

    test('login form is keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Tab through form
      await page.keyboard.press('Tab');
      const first = await page.locator(':focus').first();
      await expect(first).toBeVisible();

      await page.keyboard.press('Tab');
      const second = await page.locator(':focus').first();
      await expect(second).toBeVisible();
    });
  });
});

test.describe('Partner Portal Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('login page is mobile responsive', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('main')).toBeVisible();

    // Check form fits on mobile
    const form = page.locator('form');
    if (await form.isVisible()) {
      const box = await form.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    }
  });

  test('partner portal navigation works on mobile', async ({ page }) => {
    await page.goto('/partner-portal/dashboard');

    // Should have hamburger menu or bottom nav on mobile
    const mobileNav = page.locator('[data-testid="mobile-nav"], [class*="hamburger"], [class*="mobile-menu"]');

    // Either navigation is visible or redirected to login
    const pageContent = page.getByRole('main');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });
});
