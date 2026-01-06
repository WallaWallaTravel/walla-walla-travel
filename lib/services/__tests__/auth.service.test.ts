/**
 * AuthService Tests
 *
 * CRITICAL: Tests for authentication - guards access to the system
 * Coverage target: 85%+
 *
 * Key features tested:
 * - Login with valid/invalid credentials
 * - Inactive user rejection
 * - Role-based redirects
 * - Session token creation
 */

import { AuthService } from '../auth.service';
import { createMockQueryResult } from '../../__tests__/test-utils';
import { createMockUser } from '../../__tests__/factories';

// Mock the db module
jest.mock('../../db', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock password verification
jest.mock('../../auth/passwords', () => ({
  verifyPassword: jest.fn(),
}));

// Mock session creation
jest.mock('../../auth/session', () => ({
  createSession: jest.fn().mockResolvedValue('mock-session-token-123'),
}));

import { verifyPassword } from '../../auth/passwords';
import { createSession } from '../../auth/session';

describe('AuthService', () => {
  let service: AuthService;
  let mockQuery: jest.Mock;
  const mockVerifyPassword = verifyPassword as jest.Mock;
  const mockCreateSession = createSession as jest.Mock;

  beforeEach(() => {
    service = new AuthService();
    mockQuery = require('../../db').query as jest.Mock;
    mockQuery.mockClear();
    mockVerifyPassword.mockClear();
    mockCreateSession.mockClear();
    jest.clearAllMocks();
  });

  // ============================================================================
  // login() Tests
  // ============================================================================

  describe('login', () => {
    describe('successful login', () => {
      it('should login successfully with valid credentials', async () => {
        const mockUser = createMockUser({
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          is_active: true,
          password_hash: 'hashed_password',
        });
        mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));
        mockVerifyPassword.mockResolvedValueOnce(true);
        mockCreateSession.mockResolvedValueOnce('session-token-123');

        const result = await service.login({
          email: 'admin@example.com',
          password: 'correctPassword',
        });

        expect(result.token).toBe('session-token-123');
        expect(result.user.email).toBe('admin@example.com');
        expect(result.user.role).toBe('admin');
      });

      it('should redirect admin users to admin dashboard', async () => {
        const mockUser = createMockUser({ role: 'admin', is_active: true });
        mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));
        mockVerifyPassword.mockResolvedValueOnce(true);

        const result = await service.login({
          email: mockUser.email,
          password: 'password',
        });

        expect(result.redirectTo).toBe('/admin/dashboard');
      });

      it('should redirect driver users to driver portal', async () => {
        const mockUser = createMockUser({ role: 'driver', is_active: true });
        mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));
        mockVerifyPassword.mockResolvedValueOnce(true);

        const result = await service.login({
          email: mockUser.email,
          password: 'password',
        });

        expect(result.redirectTo).toBe('/driver-portal/dashboard');
      });

      it('should normalize email to lowercase for lookup', async () => {
        const mockUser = createMockUser({ email: 'admin@example.com', is_active: true });
        mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));
        mockVerifyPassword.mockResolvedValueOnce(true);

        await service.login({
          email: 'ADMIN@EXAMPLE.COM',
          password: 'password',
        });

        expect(mockQuery).toHaveBeenCalledWith(
          expect.any(String),
          ['admin@example.com']
        );
      });
    });

    describe('failed login - user not found', () => {
      it('should throw UnauthorizedError when user not found', async () => {
        mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

        await expect(
          service.login({
            email: 'nonexistent@example.com',
            password: 'password',
          })
        ).rejects.toThrow('Invalid email or password');
      });
    });

    describe('failed login - invalid password', () => {
      it('should throw UnauthorizedError for invalid password', async () => {
        const mockUser = createMockUser({ is_active: true });
        mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));
        mockVerifyPassword.mockResolvedValueOnce(false);

        await expect(
          service.login({
            email: mockUser.email,
            password: 'wrongPassword',
          })
        ).rejects.toThrow('Invalid email or password');
      });
    });

    describe('failed login - inactive account', () => {
      it('should throw ForbiddenError for inactive account', async () => {
        const mockUser = createMockUser({ is_active: false });
        mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));

        await expect(
          service.login({
            email: mockUser.email,
            password: 'password',
          })
        ).rejects.toThrow('Account is disabled');
      });
    });

    describe('session creation', () => {
      it('should call createSession with correct user data', async () => {
        const mockUser = createMockUser({
          id: 42,
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          is_active: true,
        });
        mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));
        mockVerifyPassword.mockResolvedValueOnce(true);

        await service.login({
          email: mockUser.email,
          password: 'password',
        });

        expect(mockCreateSession).toHaveBeenCalledWith({
          id: 42,
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
        });
      });
    });
  });

  // ============================================================================
  // getUserById() Tests
  // ============================================================================

  describe('getUserById', () => {
    it('should return user when found and active', async () => {
      const mockUser = createMockUser({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'admin',
        is_active: true,
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));

      const result = await service.getUserById(1);

      expect(result).toEqual({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'admin',
      });
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getUserById(999);

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      const mockUser = createMockUser({ is_active: false });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));

      const result = await service.getUserById(1);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getUserByEmail() Tests
  // ============================================================================

  describe('getUserByEmail', () => {
    it('should return user when found and active', async () => {
      const mockUser = createMockUser({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'driver',
        is_active: true,
      });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));

      const result = await service.getUserByEmail('user@example.com');

      expect(result).toEqual({
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'driver',
      });
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      const result = await service.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      const mockUser = createMockUser({ is_active: false });
      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUser]));

      const result = await service.getUserByEmail('user@example.com');

      expect(result).toBeNull();
    });

    it('should normalize email to lowercase for lookup', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([]));

      await service.getUserByEmail('USER@EXAMPLE.COM');

      // The service normalizes the email before the query
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        ['user@example.com']
      );
    });
  });
});
