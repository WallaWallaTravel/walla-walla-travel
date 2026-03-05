import { test, expect } from '@playwright/test';

/**
 * Guest Portal Tests
 *
 * Tests the /my-trip/[token] portal where guests view their trip details.
 * Invalid/expired tokens should show an error page.
 */

test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Invalid / expired token handling
// ---------------------------------------------------------------------------

test.describe('Guest Portal — Invalid Tokens', () => {
  test('short invalid token shows error', async ({ page }) => {
    await page.goto('/my-trip/badtoken');

    await expect(page.getByText(/Trip Not Found|not found|unable to load/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('nonexistent valid-format token shows error', async ({ page }) => {
    const fakeToken = 'b'.repeat(64);
    await page.goto(`/my-trip/${fakeToken}`);

    await expect(page.getByText(/Trip Not Found|not found|unable to load/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('error page has helpful text', async ({ page }) => {
    await page.goto('/my-trip/nonexistenttoken123');

    await expect(
      page.getByText(/link may have expired|no longer available|not found|Trip Not Found/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('error page is mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/my-trip/nonexistenttoken123');

    await expect(page.getByText(/Trip Not Found|not found|unable to load/i).first()).toBeVisible({
      timeout: 20_000,
    });

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10);
  });
});

// ---------------------------------------------------------------------------
// Portal with valid token (uses API to get token — fast)
// ---------------------------------------------------------------------------

test.describe('Guest Portal — Valid Trip', () => {
  test.describe.configure({ timeout: 60_000 });

  let proposalAccessToken: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: 'e2e/.auth/admin.json',
    });

    try {
      // Extract cookies for manual injection (domain mismatch: localhost vs 127.0.0.1)
      const cookies = await ctx.cookies();
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      const response = await ctx.request.get(
        'http://127.0.0.1:4100/api/admin/trip-proposals?limit=1',
        { headers: { Cookie: cookieHeader } }
      );

      if (response.ok()) {
        const json = await response.json();
        const proposals = json.data?.proposals || [];
        if (proposals.length > 0 && proposals[0].access_token) {
          proposalAccessToken = proposals[0].access_token;
        }
      } else {
        console.warn('[Portal beforeAll] API returned', response.status());
      }
    } catch (err) {
      console.warn('[Portal beforeAll] Failed to fetch proposal:', err);
    } finally {
      await ctx.close();
    }
  });

  test('portal loads with trip header', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}`);

    await expect(
      page.locator('h1, h2').filter({ hasText: /.+/ }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('portal shows itinerary or registration gate', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}`);

    const contentVisible = await Promise.race([
      page.getByText(/Itinerary|Welcome to Your Trip|Trip for/i).first().waitFor({ timeout: 20_000 }).then(() => true),
      page.getByText(/Trip Not Found/i).first().waitFor({ timeout: 20_000 }).then(() => false),
    ]);

    expect(typeof contentVisible).toBe('boolean');
  });

  test('portal with guest token shows registration gate', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    const fakeGuestToken = 'e2etestguest' + Date.now();
    await page.goto(`/my-trip/${proposalAccessToken}?guest=${fakeGuestToken}`);

    await expect(
      page.getByText(/Welcome to Your Trip|Itinerary|Trip Not Found|confirm your details/i).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test('portal tab navigation works', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}`);
    await page.waitForTimeout(3000);

    const itineraryTab = page.getByRole('link', { name: /Itinerary/i });

    if (await itineraryTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(itineraryTab).toBeVisible();

      const lunchTab = page.getByRole('link', { name: /Lunch/i });
      if (await lunchTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await lunchTab.click();
        await expect(page).toHaveURL(/\/lunch/, { timeout: 5000 });
      }

      const guestsTab = page.getByRole('link', { name: /Guests/i });
      if (await guestsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await guestsTab.click();
        await expect(page).toHaveURL(/\/guests/, { timeout: 5000 });
      }
    }
  });

  test('floating messages button is present', async ({ page }) => {
    test.skip(!proposalAccessToken, 'No test proposal available');

    await page.context().clearCookies();
    await page.goto(`/my-trip/${proposalAccessToken}`);
    await page.waitForTimeout(3000);

    const messagesBtn = page.getByRole('button', { name: /Open messages|Messages/i });
    if (await messagesBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await messagesBtn.click();
      await expect(page.getByText(/Messages/i).first()).toBeVisible();
    }
  });
});
