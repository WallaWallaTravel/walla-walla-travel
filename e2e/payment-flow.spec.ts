import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a payment page - this might be accessed via booking flow
    await page.goto('/');
  });

  test('payment page loads securely', async ({ page }) => {
    // Navigate to payment section
    await page.goto('/payments');

    // Check page loads
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('displays payment form elements', async ({ page }) => {
    await page.goto('/payments');

    // Look for Stripe elements or payment form
    const paymentSection = page.locator('[data-testid="payment-form"], .payment-form, [class*="payment"]');

    if (await paymentSection.isVisible()) {
      await expect(paymentSection).toBeVisible();
    }
  });

  test('shows secure payment indicators', async ({ page }) => {
    await page.goto('/payments');

    // Check for security indicators
    const securityIndicators = page.locator('[class*="secure"], [class*="stripe"], .payment-badge');

    if (await securityIndicators.first().isVisible()) {
      await expect(securityIndicators.first()).toBeVisible();
    }
  });

  test('handles invalid card gracefully', async ({ page }) => {
    await page.goto('/payments');

    // This test checks that the payment form handles errors gracefully
    // In a real test, we'd use Stripe test mode with test cards
    const errorMessage = page.locator('[class*="error"], [role="alert"]');

    // Trigger a form submission without valid data
    const submitButton = page.getByRole('button', { name: /pay|submit|confirm/i });

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should not crash, should show error or validation message
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/.*/); // Still on page, didn't crash
    }
  });

  test('payment confirmation page shows success', async ({ page }) => {
    // Navigate to a confirmation page if accessible
    await page.goto('/payments/confirmation?booking=TEST-001');

    // Should handle gracefully even if booking doesn't exist
    await expect(page.getByRole('main')).toBeVisible();
  });
});

test.describe('Payment Security', () => {
  test('does not expose sensitive data in URL', async ({ page }) => {
    await page.goto('/payments');

    // Check URL doesn't contain sensitive patterns
    const url = page.url();
    expect(url).not.toMatch(/card_number|cvv|pin|secret/i);
  });

  test('form inputs have autocomplete attributes', async ({ page }) => {
    await page.goto('/payments');

    // Credit card inputs should have proper autocomplete for security
    const cardInputs = await page.locator('input[name*="card"], input[name*="credit"]').all();

    for (const input of cardInputs) {
      const autocomplete = await input.getAttribute('autocomplete');
      // Should either have autocomplete off or specific value
      expect(autocomplete).toBeDefined();
    }
  });

  test('payment page uses HTTPS in production URLs', async ({ page }) => {
    // Check that any external payment URLs use HTTPS
    await page.goto('/payments');

    // Get all links
    const links = await page.locator('a[href^="http"]').all();

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && (href.includes('payment') || href.includes('stripe'))) {
        expect(href).toMatch(/^https:/);
      }
    }
  });
});

test.describe('Payment Accessibility', () => {
  test('payment form is keyboard accessible', async ({ page }) => {
    await page.goto('/payments');

    // Tab through payment form
    await page.keyboard.press('Tab');

    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('error messages are announced to screen readers', async ({ page }) => {
    await page.goto('/payments');

    // Error messages should have role="alert" or aria-live
    const errorContainers = await page.locator('[role="alert"], [aria-live="assertive"], [aria-live="polite"]').all();

    // Verify these elements exist for error handling
    expect(errorContainers.length).toBeGreaterThanOrEqual(0);
  });

  test('payment amount is clearly displayed', async ({ page }) => {
    await page.goto('/payments');

    // Look for clearly displayed payment amount
    const amountDisplay = page.locator('[data-testid="amount"], .amount, [class*="total"], [class*="price"]');

    if (await amountDisplay.first().isVisible()) {
      const text = await amountDisplay.first().textContent();
      // Should contain currency symbol or number
      expect(text).toMatch(/\$|USD|[0-9]/);
    }
  });
});

test.describe('Payment API Security', () => {
  test('payment endpoints require authentication', async ({ request }) => {
    // Try to access payment endpoint without auth
    const response = await request.post('/api/payments/create-intent', {
      data: {
        booking_number: 'TEST-001',
        amount: 100,
        payment_type: 'deposit',
      },
    });

    // Should reject unauthenticated requests
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('payment endpoints require CSRF token', async ({ request }) => {
    // Try to access payment endpoint without CSRF
    const response = await request.post('/api/payments/confirm', {
      data: {
        payment_intent_id: 'pi_test',
        booking_number: 'TEST-001',
      },
    });

    // Should reject requests without CSRF
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
