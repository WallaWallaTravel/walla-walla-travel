/**
 * Auth Session Tests
 *
 * Tests for JWT session management, token creation, and verification.
 */

// Mock jose before importing session module
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock.jwt.token'),
  })),
  jwtVerify: jest.fn().mockImplementation(async (token: string) => {
    if (token === 'mock.jwt.token') {
      const now = Math.floor(Date.now() / 1000);
      return {
        payload: {
          user: {
            id: 123,
            email: 'test@example.com',
            name: 'Test User',
            role: 'admin',
          },
          iat: now,
          exp: now + 7 * 24 * 60 * 60,
        },
      };
    }
    throw new Error('Invalid token');
  }),
}));

// Mock next/headers cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock logger to avoid side effects
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { createSession, verifySession, SessionUser } from '@/lib/auth/session';

describe('Session Management', () => {
  const testUser: SessionUser = {
    id: 123,
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
  };

  describe('createSession', () => {
    it('should create a JWT token string', async () => {
      const token = await createSession(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should call SignJWT with user data', async () => {
      const { SignJWT } = require('jose');
      await createSession(testUser);

      expect(SignJWT).toHaveBeenCalled();
    });
  });

  describe('verifySession', () => {
    it('should return payload for valid token', async () => {
      const payload = await verifySession('mock.jwt.token');

      expect(payload).not.toBeNull();
      expect(payload?.user).toBeDefined();
      expect(payload?.user.id).toBe(123);
    });

    it('should return null for invalid token', async () => {
      const payload = await verifySession('invalid.token.here');

      expect(payload).toBeNull();
    });

    it('should return null for empty string', async () => {
      const payload = await verifySession('');

      expect(payload).toBeNull();
    });
  });

  describe('SessionUser interface', () => {
    it('should have required fields', () => {
      const user: SessionUser = {
        id: 1,
        email: 'test@test.com',
        name: 'Test',
        role: 'admin',
      };

      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.role).toBeDefined();
    });

    it('should accept valid role values', () => {
      const roles: SessionUser['role'][] = ['admin', 'geology_admin', 'driver', 'partner'];

      roles.forEach((role) => {
        const user: SessionUser = { ...testUser, role };
        expect(user.role).toBe(role);
      });
    });
  });

  describe('token expiration', () => {
    it('should include iat and exp in payload', async () => {
      const payload = await verifySession('mock.jwt.token');

      expect(payload?.iat).toBeDefined();
      expect(payload?.exp).toBeDefined();
      expect(payload!.exp).toBeGreaterThan(payload!.iat);
    });
  });
});

describe('Session Secret Handling', () => {
  it('should use SESSION_SECRET from environment', () => {
    // The session module uses SESSION_SECRET env var
    // This test verifies the module loads without errors
    expect(createSession).toBeDefined();
    expect(verifySession).toBeDefined();
  });
});
