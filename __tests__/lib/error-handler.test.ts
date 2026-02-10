/**
 * Tests for Enhanced Error Handler Middleware
 * @module lib/api/middleware/error-handler
 *
 * Tests the error classes, withErrorHandling wrapper,
 * catchAsync, and assertion helpers.
 */

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  generateSecureString: jest.fn(() => 'abc123def'),
}));

import {
  ApiError,
  ServiceError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  ServiceUnavailableError,
  withErrorHandling,
  catchAsync,
  assert,
  assertDefined,
  assertAuthorized,
} from '@/lib/api/middleware/error-handler';
import { logError } from '@/lib/monitoring/error-logger';

// Helper to create a mock NextRequest
function createMockRequest(method = 'GET', path = '/api/test') {
  return {
    url: `http://localhost${path}`,
    method,
    nextUrl: { pathname: path },
    headers: {
      get: jest.fn((name: string) => {
        if (name === 'user-agent') return 'TestAgent/1.0';
        return null;
      }),
    },
  } as any;
}

// Helper to create route context
function createMockContext() {
  return { params: Promise.resolve({}) } as any;
}

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Error Classes
  // ===========================================================================

  describe('ApiError', () => {
    it('should create with message, statusCode, and code', () => {
      const error = new ApiError('Test error', 500, 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('ApiError');
    });

    it('should default to 500 status code', () => {
      const error = new ApiError('Server error');
      expect(error.statusCode).toBe(500);
    });

    it('should be an instance of Error', () => {
      const error = new ApiError('Test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ServiceError', () => {
    it('should create with code, message, and details', () => {
      const error = new ServiceError('NOT_FOUND', 'User not found', { id: 1 });
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('User not found');
      expect(error.details).toEqual({ id: 1 });
      expect(error.name).toBe('ServiceError');
    });

    it('should convert to ApiError with correct status codes', () => {
      const cases = [
        { code: 'NOT_FOUND', expectedStatus: 404 },
        { code: 'VALIDATION_ERROR', expectedStatus: 422 },
        { code: 'CONFLICT', expectedStatus: 409 },
        { code: 'UNAUTHORIZED', expectedStatus: 401 },
        { code: 'FORBIDDEN', expectedStatus: 403 },
        { code: 'DATABASE_ERROR', expectedStatus: 500 },
        { code: 'UNKNOWN_CODE', expectedStatus: 500 },
      ];

      for (const { code, expectedStatus } of cases) {
        const error = new ServiceError(code, 'test');
        const apiError = error.toApiError();
        expect(apiError).toBeInstanceOf(ApiError);
        expect(apiError.statusCode).toBe(expectedStatus);
      }
    });
  });

  describe('Specific Error Classes', () => {
    it('BadRequestError should have 400 status', () => {
      const error = new BadRequestError();
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad Request');
      expect(error.name).toBe('BadRequestError');
    });

    it('UnauthorizedError should have 401 status', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('ForbiddenError should have 403 status', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    it('NotFoundError should have 404 status', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('ConflictError should have 409 status', () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource conflict');
    });

    it('ValidationError should have 422 status and errors', () => {
      const errors = { email: ['Invalid email'] };
      const error = new ValidationError('Validation failed', errors);
      expect(error.statusCode).toBe(422);
      expect(error.errors).toEqual(errors);
    });

    it('RateLimitError should have 429 status', () => {
      const error = new RateLimitError();
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests');
    });

    it('ServiceUnavailableError should have 503 status', () => {
      const error = new ServiceUnavailableError();
      expect(error.statusCode).toBe(503);
    });

    it('all error classes should accept custom messages', () => {
      expect(new BadRequestError('Custom').message).toBe('Custom');
      expect(new UnauthorizedError('Custom').message).toBe('Custom');
      expect(new ForbiddenError('Custom').message).toBe('Custom');
      expect(new NotFoundError('Custom').message).toBe('Custom');
      expect(new ConflictError('Custom').message).toBe('Custom');
      expect(new RateLimitError('Custom').message).toBe('Custom');
      expect(new ServiceUnavailableError('Custom').message).toBe('Custom');
    });

    it('all should inherit from ApiError and Error', () => {
      const errors = [
        new BadRequestError(),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new ValidationError(),
        new RateLimitError(),
        new ServiceUnavailableError(),
      ];
      errors.forEach(e => {
        expect(e).toBeInstanceOf(ApiError);
        expect(e).toBeInstanceOf(Error);
      });
    });
  });

  // ===========================================================================
  // withErrorHandling
  // ===========================================================================

  describe('withErrorHandling', () => {
    it('should pass through successful responses', async () => {
      const { NextResponse } = require('next/server');
      const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));
      const wrapped = withErrorHandling(handler);

      const response = await wrapped(createMockRequest(), createMockContext());
      const body = await response.json();

      expect(body).toEqual({ ok: true });
    });

    it('should handle ApiError and return formatted response', async () => {
      const handler = jest.fn().mockRejectedValue(new NotFoundError('User not found'));
      const wrapped = withErrorHandling(handler);

      const response = await wrapped(createMockRequest(), createMockContext());
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('User not found');
      expect(body.error.statusCode).toBe(404);
      expect(body.timestamp).toBeDefined();
    });

    it('should handle ServiceError via backwards compat', async () => {
      const handler = jest.fn().mockRejectedValue(
        new ServiceError('NOT_FOUND', 'Booking not found')
      );
      const wrapped = withErrorHandling(handler);

      const response = await wrapped(createMockRequest(), createMockContext());
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.message).toBe('Booking not found');
    });

    it('should handle ValidationError with field errors', async () => {
      const handler = jest.fn().mockRejectedValue(
        new ValidationError('Validation failed', { email: ['Invalid'] })
      );
      const wrapped = withErrorHandling(handler);

      const response = await wrapped(createMockRequest(), createMockContext());
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.errors).toEqual({ email: ['Invalid'] });
    });

    it('should handle Zod-like errors', async () => {
      const zodError = Object.assign(new Error('Zod'), {
        name: 'ZodError',
        errors: [
          { path: ['email'], message: 'Required' },
          { path: ['name', 'first'], message: 'Too short' },
        ],
      });
      const handler = jest.fn().mockRejectedValue(zodError);
      const wrapped = withErrorHandling(handler);

      const response = await wrapped(createMockRequest(), createMockContext());
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.errors.email).toEqual(['Required']);
      expect(body.error.errors['name.first']).toEqual(['Too short']);
    });

    it('should handle database errors by PostgreSQL code', async () => {
      const dbErrors = [
        { code: '23505', expectedStatus: 409, expectedMsg: 'Resource already exists' },
        { code: '23503', expectedStatus: 400, expectedMsg: 'Related resource not found' },
        { code: '23502', expectedStatus: 400, expectedMsg: 'Required field is missing' },
        { code: '22P02', expectedStatus: 400, expectedMsg: 'Invalid data format' },
        { code: '42P01', expectedStatus: 503, expectedMsg: 'Database schema error' },
        { code: '99999', expectedStatus: 500, expectedMsg: 'Database operation failed' },
      ];

      for (const { code, expectedStatus, expectedMsg } of dbErrors) {
        const handler = jest.fn().mockRejectedValue({ code, message: 'DB error' });
        const wrapped = withErrorHandling(handler);

        const response = await wrapped(createMockRequest(), createMockContext());
        const body = await response.json();

        expect(response.status).toBe(expectedStatus);
        expect(body.error.message).toBe(expectedMsg);
      }
    });

    it('should handle generic unknown errors with 500', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Something broke'));
      const wrapped = withErrorHandling(handler);

      const response = await wrapped(createMockRequest(), createMockContext());

      expect(response.status).toBe(500);
    });

    it('should handle non-Error thrown values', async () => {
      const handler = jest.fn().mockRejectedValue('string error');
      const wrapped = withErrorHandling(handler);

      const response = await wrapped(createMockRequest(), createMockContext());

      expect(response.status).toBe(500);
    });

    it('should log errors via logError', async () => {
      const handler = jest.fn().mockRejectedValue(new NotFoundError('Missing'));
      const wrapped = withErrorHandling(handler);

      await wrapped(createMockRequest('GET', '/api/users'), createMockContext());

      expect(logError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'NotFoundError',
          errorMessage: 'Missing',
          requestPath: '/api/users',
          requestMethod: 'GET',
        })
      );
    });

    it('should include requestId in error response', async () => {
      const handler = jest.fn().mockRejectedValue(new BadRequestError('Bad'));
      const wrapped = withErrorHandling(handler);

      const response = await wrapped(createMockRequest(), createMockContext());
      const body = await response.json();

      expect(body.requestId).toMatch(/^req_/);
    });
  });

  // ===========================================================================
  // catchAsync
  // ===========================================================================

  describe('catchAsync', () => {
    it('should return value on success', async () => {
      const result = await catchAsync(async () => 42);
      expect(result).toBe(42);
    });

    it('should wrap errors as ApiError', async () => {
      await expect(
        catchAsync(async () => { throw new Error('Oops'); })
      ).rejects.toThrow(ApiError);
    });

    it('should preserve statusCode from original error', async () => {
      try {
        await catchAsync(async () => { throw new NotFoundError('Missing'); });
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
      }
    });

    it('should use custom error message when provided', async () => {
      try {
        await catchAsync(async () => { throw new Error('Internal'); }, 'Custom message');
      } catch (error: any) {
        expect(error.message).toBe('Custom message');
      }
    });
  });

  // ===========================================================================
  // Assert helpers
  // ===========================================================================

  describe('assert', () => {
    it('should not throw for truthy condition', () => {
      expect(() => assert(true, 'Should not throw')).not.toThrow();
      expect(() => assert(1, 'Should not throw')).not.toThrow();
      expect(() => assert('yes', 'Should not throw')).not.toThrow();
    });

    it('should throw ApiError for falsy condition', () => {
      expect(() => assert(false, 'Failed')).toThrow(ApiError);
      expect(() => assert(0, 'Failed')).toThrow(ApiError);
      expect(() => assert('', 'Failed')).toThrow(ApiError);
      expect(() => assert(null, 'Failed')).toThrow(ApiError);
    });

    it('should default to 400 status code', () => {
      try {
        assert(false, 'Bad input');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
      }
    });

    it('should accept custom status code', () => {
      try {
        assert(false, 'Not found', 404);
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
      }
    });
  });

  describe('assertDefined', () => {
    it('should not throw for defined values', () => {
      expect(() => assertDefined('value')).not.toThrow();
      expect(() => assertDefined(0)).not.toThrow();
      expect(() => assertDefined(false)).not.toThrow();
      expect(() => assertDefined('')).not.toThrow();
    });

    it('should throw NotFoundError for null', () => {
      expect(() => assertDefined(null)).toThrow(NotFoundError);
    });

    it('should throw NotFoundError for undefined', () => {
      expect(() => assertDefined(undefined)).toThrow(NotFoundError);
    });

    it('should use custom message', () => {
      try {
        assertDefined(null, 'User not found');
      } catch (error: any) {
        expect(error.message).toBe('User not found');
      }
    });
  });

  describe('assertAuthorized', () => {
    it('should not throw for true', () => {
      expect(() => assertAuthorized(true)).not.toThrow();
    });

    it('should throw ForbiddenError for false', () => {
      expect(() => assertAuthorized(false)).toThrow(ForbiddenError);
    });

    it('should use custom message', () => {
      try {
        assertAuthorized(false, 'No access');
      } catch (error: any) {
        expect(error.message).toBe('No access');
      }
    });
  });
});
