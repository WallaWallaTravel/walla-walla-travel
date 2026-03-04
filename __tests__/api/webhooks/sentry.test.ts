/**
 * Tests for Sentry Webhook Integration
 *
 * Tests signature verification, issue creation, deduplication,
 * and graceful handling of edge cases.
 */

import { createHmac } from 'crypto';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn().mockResolvedValue('ERR-mock'),
}));

const mockCreateGitHubIssue = jest.fn();
const mockFindOpenIssue = jest.fn();

jest.mock('@/lib/github/create-issue', () => ({
  createGitHubIssue: (...args: unknown[]) => mockCreateGitHubIssue(...args),
  findOpenIssue: (...args: unknown[]) => mockFindOpenIssue(...args),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { verifySentrySignature } from '@/lib/webhooks/sentry/verify';
import { handleSentryIssueAlert } from '@/lib/webhooks/sentry/issue-alert.handler';

// ── Helpers ────────────────────────────────────────────────────────────────

const TEST_SECRET = 'test-webhook-secret-12345';

function makeSignature(body: string, secret: string = TEST_SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function makeSentryPayload(overrides: Record<string, unknown> = {}) {
  return {
    action: 'created',
    data: {
      issue: {
        title: 'TypeError: Cannot read properties of null',
        culprit: 'app/api/bookings/route.ts in handleBooking',
        shortId: 'WWT-42',
        metadata: {
          type: 'TypeError',
          value: "Cannot read properties of null (reading 'id')",
          filename: 'app/api/bookings/route.ts',
        },
        count: '5',
        firstSeen: '2026-03-01T12:00:00Z',
        permalink: 'https://sentry.io/issues/12345/',
        project: {
          slug: 'walla-walla-travel',
          name: 'Walla Walla Travel',
        },
      },
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Sentry Webhook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, SENTRY_WEBHOOK_SECRET: TEST_SECRET };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Signature Verification
  // ═══════════════════════════════════════════════════════════════════════

  describe('verifySentrySignature', () => {
    it('should accept a valid signature', () => {
      const body = '{"test": true}';
      const signature = makeSignature(body);

      expect(verifySentrySignature(body, signature)).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const body = '{"test": true}';

      expect(verifySentrySignature(body, 'invalid-signature-hex')).toBe(false);
    });

    it('should reject when signature is empty', () => {
      const body = '{"test": true}';

      expect(verifySentrySignature(body, '')).toBe(false);
    });

    it('should reject when SENTRY_WEBHOOK_SECRET is not set', () => {
      delete process.env.SENTRY_WEBHOOK_SECRET;
      const body = '{"test": true}';
      const signature = makeSignature(body);

      expect(verifySentrySignature(body, signature)).toBe(false);
    });

    it('should reject a signature made with a different secret', () => {
      const body = '{"test": true}';
      const signature = makeSignature(body, 'wrong-secret');

      expect(verifySentrySignature(body, signature)).toBe(false);
    });

    it('should reject when body has been tampered with', () => {
      const originalBody = '{"test": true}';
      const signature = makeSignature(originalBody);
      const tamperedBody = '{"test": false}';

      expect(verifySentrySignature(tamperedBody, signature)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Issue Alert Handler
  // ═══════════════════════════════════════════════════════════════════════

  describe('handleSentryIssueAlert', () => {
    it('should create a GitHub issue for a new Sentry error', async () => {
      mockFindOpenIssue.mockResolvedValue(null);
      mockCreateGitHubIssue.mockResolvedValue({
        number: 99,
        title: '[Sentry] TypeError: Cannot read properties of null',
        html_url: 'https://github.com/owner/repo/issues/99',
      });

      await handleSentryIssueAlert(makeSentryPayload());

      expect(mockFindOpenIssue).toHaveBeenCalledWith({
        labels: ['sentry-error', 'auto-triage'],
        titleContains: 'TypeError: Cannot read properties of null',
      });

      expect(mockCreateGitHubIssue).toHaveBeenCalledWith({
        title: '[Sentry] TypeError: Cannot read properties of null',
        body: expect.stringContaining('Sentry Error'),
        labels: ['sentry-error', 'auto-triage'],
      });
    });

    it('should skip creation when a duplicate issue exists', async () => {
      mockFindOpenIssue.mockResolvedValue({
        number: 42,
        title: '[Sentry] TypeError: Cannot read properties of null',
        html_url: 'https://github.com/owner/repo/issues/42',
      });

      await handleSentryIssueAlert(makeSentryPayload());

      expect(mockFindOpenIssue).toHaveBeenCalled();
      expect(mockCreateGitHubIssue).not.toHaveBeenCalled();
    });

    it('should handle missing issue data gracefully', async () => {
      await handleSentryIssueAlert({
        action: 'created',
        data: {} as any,
      });

      expect(mockFindOpenIssue).not.toHaveBeenCalled();
      expect(mockCreateGitHubIssue).not.toHaveBeenCalled();
    });

    it('should include error details in the issue body', async () => {
      mockFindOpenIssue.mockResolvedValue(null);
      mockCreateGitHubIssue.mockResolvedValue({
        number: 100,
        title: 'test',
        html_url: 'https://github.com/owner/repo/issues/100',
      });

      await handleSentryIssueAlert(makeSentryPayload());

      const createCall = mockCreateGitHubIssue.mock.calls[0][0];
      expect(createCall.body).toContain('TypeError: Cannot read properties of null');
      expect(createCall.body).toContain('app/api/bookings/route.ts in handleBooking');
      expect(createCall.body).toContain('WWT-42');
      expect(createCall.body).toContain('View in Sentry');
      expect(createCall.body).toContain('Walla Walla Travel');
    });

    it('should handle issue with minimal data', async () => {
      mockFindOpenIssue.mockResolvedValue(null);
      mockCreateGitHubIssue.mockResolvedValue({
        number: 101,
        title: 'test',
        html_url: 'https://github.com/owner/repo/issues/101',
      });

      const minimalPayload = {
        action: 'created',
        data: {
          issue: {
            title: 'Some error',
            culprit: '',
            shortId: 'X-1',
            metadata: {},
            count: '1',
            firstSeen: '',
            permalink: '',
            project: { slug: 'test', name: 'Test' },
          },
        },
      };

      await handleSentryIssueAlert(minimalPayload);

      expect(mockCreateGitHubIssue).toHaveBeenCalledWith({
        title: '[Sentry] Some error',
        body: expect.any(String),
        labels: ['sentry-error', 'auto-triage'],
      });
    });
  });
});
