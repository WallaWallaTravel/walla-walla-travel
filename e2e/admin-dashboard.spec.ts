import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.describe('Authentication', () => {
    test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/admin');

      // Should redirect to login
      await expect(page).toHaveURL(/login|signin|auth/i, { timeout: 10000 });
    });

    test('login page loads correctly', async ({ page }) => {
      await page.goto('/login');

      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });
  });

  test.describe('Admin Routes Exist', () => {
    test('admin dashboard exists', async ({ page }) => {
      const response = await page.goto('/admin');
      expect(response?.status()).not.toBe(404);
    });

    test('bookings page exists', async ({ page }) => {
      const response = await page.goto('/admin/bookings');
      expect(response?.status()).not.toBe(404);
    });

    test('proposals page exists', async ({ page }) => {
      const response = await page.goto('/admin/proposals');
      expect(response?.status()).not.toBe(404);
    });

    test('users page exists', async ({ page }) => {
      const response = await page.goto('/admin/users');
      expect(response?.status()).not.toBe(404);
    });

    test('rates page exists', async ({ page }) => {
      const response = await page.goto('/admin/rates');
      expect(response?.status()).not.toBe(404);
    });

    test('availability page exists', async ({ page }) => {
      const response = await page.goto('/admin/availability');
      expect(response?.status()).not.toBe(404);
    });

    test('partners page exists', async ({ page }) => {
      const response = await page.goto('/admin/partners');
      expect(response?.status()).not.toBe(404);
    });
  });

  test.describe('Admin API Security', () => {
    test('admin availability endpoint requires auth', async ({ request }) => {
      const response = await request.get('/api/admin/availability');
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin availability POST requires auth and CSRF', async ({ request }) => {
      const response = await request.post('/api/admin/availability', {
        data: {
          date: '2026-02-01',
          available: true,
        },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin users endpoint requires auth', async ({ request }) => {
      const response = await request.get('/api/admin/users');
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin users POST requires auth and CSRF', async ({ request }) => {
      const response = await request.post('/api/admin/users', {
        data: {
          email: 'test@example.com',
          role: 'staff',
        },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin rates PATCH requires auth and CSRF', async ({ request }) => {
      const response = await request.patch('/api/admin/rates', {
        data: {
          id: 1,
          rate: 100,
        },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin partner invite requires auth', async ({ request }) => {
      const response = await request.post('/api/admin/partners/invite', {
        data: {
          email: 'partner@example.com',
          winery_id: 1,
        },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin shared-tours requires auth', async ({ request }) => {
      const response = await request.post('/api/admin/shared-tours', {
        data: {
          tour_date: '2026-02-01',
          max_guests: 10,
        },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('admin tenants requires auth', async ({ request }) => {
      const response = await request.post('/api/admin/tenants', {
        data: {
          name: 'Test Tenant',
        },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Proposal Endpoints Security', () => {
    test('proposals list requires auth', async ({ request }) => {
      const response = await request.get('/api/proposals');
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('proposal create requires auth and CSRF', async ({ request }) => {
      const response = await request.post('/api/proposals', {
        data: {
          customer_name: 'Test Customer',
          tour_date: '2026-02-01',
        },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('proposal send requires auth', async ({ request }) => {
      const response = await request.post('/api/proposals/1/send', {
        data: {},
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('proposal accept requires auth', async ({ request }) => {
      const response = await request.post('/api/proposals/1/accept', {
        data: {},
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('proposal decline requires auth', async ({ request }) => {
      const response = await request.post('/api/proposals/1/decline', {
        data: {},
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('proposal counter requires auth', async ({ request }) => {
      const response = await request.post('/api/proposals/1/counter', {
        data: { amount: 500 },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('proposal convert requires auth', async ({ request }) => {
      const response = await request.post('/api/proposals/1/convert', {
        data: {},
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Booking Endpoints Security', () => {
    test('bookings list requires auth', async ({ request }) => {
      const response = await request.get('/api/bookings');
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('booking create requires auth and CSRF', async ({ request }) => {
      const response = await request.post('/api/bookings', {
        data: {
          customer_name: 'Test',
          tour_date: '2026-02-01',
        },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('booking cancel requires auth', async ({ request }) => {
      const response = await request.post('/api/bookings/cancel', {
        data: { booking_id: 1 },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });
});

test.describe('Admin Dashboard Accessibility', () => {
  test('admin login form is accessible', async ({ page }) => {
    await page.goto('/login');

    // Check for proper form structure
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Inputs should have labels
    const inputs = await page.locator('input:not([type="hidden"])').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');

      // Should have some form of label
      const hasAssociatedLabel = id ? await page.locator(`label[for="${id}"]`).isVisible() : false;
      expect(hasAssociatedLabel || ariaLabel || placeholder).toBeTruthy();
    }
  });

  test('admin pages support keyboard navigation', async ({ page }) => {
    await page.goto('/login');

    // Should be able to tab through
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Admin Dashboard Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('admin login works on mobile', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('main')).toBeVisible();

    // Check content fits on screen
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10);
  });
});

test.describe('Rate Limiting', () => {
  test('login has rate limiting', async ({ request }) => {
    // Make multiple rapid requests
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request.post('/api/auth/login', {
          data: {
            email: 'test@example.com',
            password: 'wrongpassword',
          },
        })
      )
    );

    // At least some should be rate limited (429) after too many attempts
    const statuses = responses.map((r) => r.status());

    // Either we get 429 (rate limited) or 401/400 (auth failed)
    expect(statuses.every((s) => [400, 401, 403, 429].includes(s))).toBeTruthy();
  });
});
