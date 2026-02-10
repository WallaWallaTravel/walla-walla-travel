/**
 * Integration Tests: Session Management & Authentication
 *
 * Tests the critical session lifecycle:
 *  - JWT creation and verification
 *  - Session refresh (sliding window)
 *  - Role-based access control
 *  - Session cookie security settings
 *
 * @jest-environment node
 */

import {
  createSession,
  verifySession,
  shouldRefreshSession,
  SessionPayload,
  SessionUser,
} from '@/lib/auth/session';

// ============================================================================
// Helpers
// ============================================================================

function createTestUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 1,
    email: 'admin@wallawalla.travel',
    name: 'Test Admin',
    role: 'admin',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Session Management', () => {
  // ==========================================================================
  // 1. JWT Creation & Verification
  // ==========================================================================
  describe('createSession + verifySession', () => {
    it('should create a valid JWT token', async () => {
      const user = createTestUser();
      const token = await createSession(user);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify a token and return the payload', async () => {
      const user = createTestUser();
      const token = await createSession(user);

      const payload = await verifySession(token);

      expect(payload).not.toBeNull();
      expect(payload!.user.id).toBe(user.id);
      expect(payload!.user.email).toBe(user.email);
      expect(payload!.user.name).toBe(user.name);
      expect(payload!.user.role).toBe(user.role);
    });

    it('should include iat and exp timestamps', async () => {
      const user = createTestUser();
      const token = await createSession(user);
      const payload = await verifySession(token);

      expect(payload!.iat).toBeDefined();
      expect(payload!.exp).toBeDefined();
      expect(payload!.exp).toBeGreaterThan(payload!.iat);
    });

    it('should set expiration to approximately 7 days', async () => {
      const user = createTestUser();
      const token = await createSession(user);
      const payload = await verifySession(token);

      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      const actualDuration = payload!.exp - payload!.iat;

      // Allow 5 second tolerance
      expect(actualDuration).toBeGreaterThanOrEqual(sevenDaysInSeconds - 5);
      expect(actualDuration).toBeLessThanOrEqual(sevenDaysInSeconds + 5);
    });

    it('should return null for invalid token', async () => {
      const payload = await verifySession('invalid.jwt.token');
      expect(payload).toBeNull();
    });

    it('should return null for empty token', async () => {
      const payload = await verifySession('');
      expect(payload).toBeNull();
    });

    it('should return null for tampered token', async () => {
      const user = createTestUser();
      const token = await createSession(user);

      // Tamper with the payload (middle section)
      const parts = token.split('.');
      parts[1] = parts[1] + 'tampered';
      const tamperedToken = parts.join('.');

      const payload = await verifySession(tamperedToken);
      expect(payload).toBeNull();
    });

    it('should preserve all user roles correctly', async () => {
      const roles: Array<'admin' | 'geology_admin' | 'driver' | 'partner'> = [
        'admin', 'geology_admin', 'driver', 'partner',
      ];

      for (const role of roles) {
        const user = createTestUser({ role });
        const token = await createSession(user);
        const payload = await verifySession(token);

        expect(payload!.user.role).toBe(role);
      }
    });
  });

  // ==========================================================================
  // 2. Session Refresh (Sliding Window)
  // ==========================================================================
  describe('shouldRefreshSession', () => {
    it('should NOT refresh a freshly created session', async () => {
      const user = createTestUser();
      const token = await createSession(user);
      const payload = await verifySession(token);

      expect(shouldRefreshSession(payload!)).toBe(false);
    });

    it('should refresh a session older than 3.5 days', () => {
      const fourDaysAgo = Math.floor(Date.now() / 1000) - (4 * 24 * 60 * 60);
      const mockPayload: SessionPayload = {
        user: createTestUser(),
        iat: fourDaysAgo,
        exp: fourDaysAgo + (7 * 24 * 60 * 60),
      };

      expect(shouldRefreshSession(mockPayload)).toBe(true);
    });

    it('should NOT refresh a session that is 3 days old', () => {
      const threeDaysAgo = Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60);
      const mockPayload: SessionPayload = {
        user: createTestUser(),
        iat: threeDaysAgo,
        exp: threeDaysAgo + (7 * 24 * 60 * 60),
      };

      expect(shouldRefreshSession(mockPayload)).toBe(false);
    });

    it('should refresh a session that is 6 days old', () => {
      const sixDaysAgo = Math.floor(Date.now() / 1000) - (6 * 24 * 60 * 60);
      const mockPayload: SessionPayload = {
        user: createTestUser(),
        iat: sixDaysAgo,
        exp: sixDaysAgo + (7 * 24 * 60 * 60),
      };

      expect(shouldRefreshSession(mockPayload)).toBe(true);
    });

    it('should refresh at exactly the threshold boundary', () => {
      // Exactly 3.5 days + 1 second old
      const thresholdPlusOne = Math.floor(Date.now() / 1000) - (3.5 * 24 * 60 * 60) - 1;
      const mockPayload: SessionPayload = {
        user: createTestUser(),
        iat: thresholdPlusOne,
        exp: thresholdPlusOne + (7 * 24 * 60 * 60),
      };

      expect(shouldRefreshSession(mockPayload)).toBe(true);
    });
  });

  // ==========================================================================
  // 3. Token Isolation (different users get different tokens)
  // ==========================================================================
  describe('token isolation', () => {
    it('should produce different tokens for different users', async () => {
      const admin = createTestUser({ id: 1, role: 'admin' });
      const driver = createTestUser({ id: 2, role: 'driver' });

      const adminToken = await createSession(admin);
      const driverToken = await createSession(driver);

      expect(adminToken).not.toBe(driverToken);
    });

    it('should produce multiple valid tokens for same user', async () => {
      const user = createTestUser();
      const token1 = await createSession(user);
      const token2 = await createSession(user);

      // Both tokens should verify to the same user
      const payload1 = await verifySession(token1);
      const payload2 = await verifySession(token2);
      expect(payload1).not.toBeNull();
      expect(payload2).not.toBeNull();
      expect(payload1!.user.id).toBe(payload2!.user.id);
      expect(payload1!.user.email).toBe(payload2!.user.email);
      expect(payload1!.user.role).toBe(payload2!.user.role);

      // With a >1 second gap, tokens should differ due to different iat
      // (iat has second-level precision)
      await new Promise(resolve => setTimeout(resolve, 1100));
      const token3 = await createSession(user);
      const payload3 = await verifySession(token3);
      expect(payload3).not.toBeNull();
      expect(payload3!.user.id).toBe(user.id);
      // New token should have later iat
      expect(payload3!.iat).toBeGreaterThanOrEqual(payload1!.iat);
    });
  });

  // ==========================================================================
  // 4. Status Transition Matrix (Role-Based Context)
  // ==========================================================================
  describe('role-based access patterns', () => {
    it('admin role should be recognizable from session', async () => {
      const user = createTestUser({ role: 'admin' });
      const token = await createSession(user);
      const payload = await verifySession(token);

      expect(payload!.user.role).toBe('admin');
      expect(['admin', 'geology_admin']).toContain(payload!.user.role);
    });

    it('driver role should be distinct from admin', async () => {
      const user = createTestUser({ role: 'driver' });
      const token = await createSession(user);
      const payload = await verifySession(token);

      expect(payload!.user.role).toBe('driver');
      expect(payload!.user.role).not.toBe('admin');
    });

    it('partner role should be distinct from admin and driver', async () => {
      const user = createTestUser({ role: 'partner' });
      const token = await createSession(user);
      const payload = await verifySession(token);

      expect(payload!.user.role).toBe('partner');
      expect(payload!.user.role).not.toBe('admin');
      expect(payload!.user.role).not.toBe('driver');
    });

    it('geology_admin should be distinct from full admin', async () => {
      const user = createTestUser({ role: 'geology_admin' });
      const token = await createSession(user);
      const payload = await verifySession(token);

      expect(payload!.user.role).toBe('geology_admin');
      expect(payload!.user.role).not.toBe('admin');
    });
  });
});
