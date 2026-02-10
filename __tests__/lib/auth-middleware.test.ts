/**
 * Tests for Authentication Middleware
 * @module lib/api/middleware/auth
 */

jest.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: jest.fn(),
}));

import { requireAuth, requireAdmin, requireDriver, requireAdminOrDriver } from '@/lib/api/middleware/auth';
import { getSessionFromRequest } from '@/lib/auth/session';
import { UnauthorizedError, ForbiddenError } from '@/lib/api/middleware/error-handler';

const mockGetSession = getSessionFromRequest as jest.MockedFunction<typeof getSessionFromRequest>;

function createMockRequest(url = 'http://localhost/api/test') {
  return { url, headers: new Map() } as any;
}

function createSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin' as const,
      ...overrides,
    },
    isLoggedIn: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return session when valid', async () => {
      const session = createSession();
      mockGetSession.mockResolvedValueOnce(session);

      const result = await requireAuth(createMockRequest());

      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe('test@example.com');
      expect(result.isLoggedIn).toBe(true);
    });

    it('should throw UnauthorizedError when no session', async () => {
      mockGetSession.mockResolvedValueOnce(null);

      await expect(requireAuth(createMockRequest())).rejects.toThrow(UnauthorizedError);
      await expect(requireAuth(createMockRequest())).rejects.toThrow('Authentication required');
    });

    it('should throw UnauthorizedError when session has no user', async () => {
      mockGetSession.mockResolvedValueOnce({ user: null } as any);

      await expect(requireAuth(createMockRequest())).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for undefined session', async () => {
      mockGetSession.mockResolvedValueOnce(undefined as any);

      await expect(requireAuth(createMockRequest())).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('requireAdmin', () => {
    it('should pass for admin role', async () => {
      const session = createSession({ role: 'admin' });
      await expect(requireAdmin(session)).resolves.toBeUndefined();
    });

    it('should throw ForbiddenError for driver role', async () => {
      const session = createSession({ role: 'driver' });
      await expect(requireAdmin(session)).rejects.toThrow(ForbiddenError);
      await expect(requireAdmin(session)).rejects.toThrow('Admin access required');
    });

    it('should throw ForbiddenError for partner role', async () => {
      const session = createSession({ role: 'partner' });
      await expect(requireAdmin(session)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for geology_admin role', async () => {
      const session = createSession({ role: 'geology_admin' });
      await expect(requireAdmin(session)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('requireDriver', () => {
    it('should pass for driver role', async () => {
      const session = createSession({ role: 'driver' });
      await expect(requireDriver(session)).resolves.toBeUndefined();
    });

    it('should pass for admin role (admin can act as driver)', async () => {
      const session = createSession({ role: 'admin' });
      await expect(requireDriver(session)).resolves.toBeUndefined();
    });

    it('should throw ForbiddenError for partner role', async () => {
      const session = createSession({ role: 'partner' });
      await expect(requireDriver(session)).rejects.toThrow(ForbiddenError);
      await expect(requireDriver(session)).rejects.toThrow('Driver access required');
    });

    it('should throw ForbiddenError for geology_admin role', async () => {
      const session = createSession({ role: 'geology_admin' });
      await expect(requireDriver(session)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('requireAdminOrDriver', () => {
    it('should pass for admin role', async () => {
      const session = createSession({ role: 'admin' });
      await expect(requireAdminOrDriver(session)).resolves.toBeUndefined();
    });

    it('should pass for driver role', async () => {
      const session = createSession({ role: 'driver' });
      await expect(requireAdminOrDriver(session)).resolves.toBeUndefined();
    });

    it('should throw ForbiddenError for partner role', async () => {
      const session = createSession({ role: 'partner' });
      await expect(requireAdminOrDriver(session)).rejects.toThrow(ForbiddenError);
      await expect(requireAdminOrDriver(session)).rejects.toThrow('Admin or driver access required');
    });

    it('should throw ForbiddenError for geology_admin role', async () => {
      const session = createSession({ role: 'geology_admin' });
      await expect(requireAdminOrDriver(session)).rejects.toThrow(ForbiddenError);
    });
  });
});
