import { test, expect } from '@playwright/test';

test.describe('Partner Response — Invalid Tokens', () => {
  test('invalid short token shows error state', async ({ page }) => {
    await page.goto('/partner-respond/invalid-short-token');

    // API returns 400 for tokens < 32 chars, page shows error
    await expect(page.getByText(/Request Unavailable/i)).toBeVisible({ timeout: 15_000 });
  });

  test('non-existent token shows error state', async ({ page }) => {
    // 64-char hex token that doesn't exist in DB
    const fakeToken = 'a'.repeat(64);
    await page.goto(`/partner-respond/${fakeToken}`);

    await expect(page.getByText(/Request Unavailable/i)).toBeVisible({ timeout: 15_000 });
  });

  test('error page shows helpful message', async ({ page }) => {
    await page.goto('/partner-respond/nonexistent-token-for-testing');

    await expect(page.getByText(/Request Unavailable/i)).toBeVisible({ timeout: 15_000 });
    // Should show explanation text
    const pageText = await page.textContent('body');
    expect(
      pageText?.includes('expired') || pageText?.includes('could not be found')
    ).toBeTruthy();
  });

  test('error page is not a 404', async ({ page }) => {
    const fakeToken = 'b'.repeat(64);
    const response = await page.goto(`/partner-respond/${fakeToken}`);
    expect(response?.status()).not.toBe(404);
  });
});

test.describe('Partner Response — Success Pages', () => {
  // Success page is fully static — reads action from query param, no DB needed

  test('confirm success page renders correctly', async ({ page }) => {
    await page.goto('/partner-respond/any-token/success?action=confirm');

    await expect(page.getByText('Booking Confirmed')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Thank you for confirming/i)).toBeVisible();
    await expect(page.getByText(/safely close this page/i)).toBeVisible();
    await expect(page.getByText('Powered by Walla Walla Travel')).toBeVisible();
  });

  test('modify success page renders correctly', async ({ page }) => {
    await page.goto('/partner-respond/any-token/success?action=modify');

    await expect(page.getByText('Changes Submitted')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/suggested changes/i)).toBeVisible();
  });

  test('decline success page renders correctly', async ({ page }) => {
    await page.goto('/partner-respond/any-token/success?action=decline');

    await expect(page.getByText('Response Received')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/alternative arrangements/i)).toBeVisible();
  });

  test('message success page renders correctly', async ({ page }) => {
    await page.goto('/partner-respond/any-token/success?action=message');

    await expect(page.getByText('Message Sent')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/respond shortly/i)).toBeVisible();
  });

  test('unknown action shows default success', async ({ page }) => {
    await page.goto('/partner-respond/any-token/success?action=unknown');

    await expect(page.getByText('Response Submitted')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Powered by Walla Walla Travel')).toBeVisible();
  });

  test('success page without action shows default', async ({ page }) => {
    await page.goto('/partner-respond/any-token/success');

    await expect(page.getByText('Response Submitted')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Partner Response — API Validation', () => {
  test('GET with short token returns 400', async ({ request }) => {
    const response = await request.get('/api/partner-respond/short');
    expect(response.status()).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
  });

  test('GET with non-existent token returns 404', async ({ request }) => {
    const fakeToken = 'c'.repeat(64);
    const response = await request.get(`/api/partner-respond/${fakeToken}`);
    expect(response.status()).toBe(404);

    const json = await response.json();
    expect(json.success).toBe(false);
  });

  test('POST with short token returns 400', async ({ request }) => {
    const response = await request.post('/api/partner-respond/short', {
      data: {
        action: 'confirm',
        responder_name: 'Test Person',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('POST with non-existent token returns error', async ({ request }) => {
    const fakeToken = 'd'.repeat(64);
    const response = await request.post(`/api/partner-respond/${fakeToken}`, {
      data: {
        action: 'confirm',
        responder_name: 'Test Person',
      },
    });
    // 404 (not found) or 422/500 (validation)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST with invalid action returns validation error', async ({ request }) => {
    const fakeToken = 'e'.repeat(64);
    const response = await request.post(`/api/partner-respond/${fakeToken}`, {
      data: {
        action: 'invalid_action',
        responder_name: 'Test',
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST without responder_name returns validation error', async ({ request }) => {
    const fakeToken = 'f'.repeat(64);
    const response = await request.post(`/api/partner-respond/${fakeToken}`, {
      data: {
        action: 'confirm',
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Partner Response — Form Structure', () => {
  // The partner response form requires a valid token from the DB.
  // These tests validate the form's action-specific behavior using
  // the ?action= query parameter which pre-selects an action on page load.
  // Since we can't create a token without admin API + DB access,
  // form-level tests are limited to what we can verify without a valid token.

  test('partner respond page renders loading skeleton then error', async ({ page }) => {
    const fakeToken = 'f'.repeat(64);
    await page.goto(`/partner-respond/${fakeToken}`);

    // Should show error state (not a 404 or crash)
    await expect(page.getByText(/Request Unavailable/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/could not be found|expired|revoked/i)).toBeVisible();
  });

  test('partner respond page with action query param loads', async ({ page }) => {
    // Even with an invalid token, the page should attempt to load
    const fakeToken = 'g'.repeat(64);
    await page.goto(`/partner-respond/${fakeToken}?action=confirm`);

    // Will still show error because token is invalid
    await expect(page.getByText(/Request Unavailable/i)).toBeVisible({ timeout: 15_000 });
  });
});
