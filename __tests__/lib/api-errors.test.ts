/**
 * Unit Tests for API Error Handling
 */

import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '@/lib/api-errors';

describe('API Error Classes', () => {
  describe('ApiError', () => {
    it('should create error with correct properties', () => {
      const error = new ApiError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('ApiError');
    });

    it('should set isOperational to false when specified', () => {
      const error = new ApiError('Test error', 500, false);

      expect(error.isOperational).toBe(false);
    });
  });

  describe('BadRequestError', () => {
    it('should have status code 400', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should use default message', () => {
      const error = new BadRequestError();

      expect(error.message).toBe('Bad Request');
    });
  });

  describe('UnauthorizedError', () => {
    it('should have status code 401', () => {
      const error = new UnauthorizedError('Not logged in');

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Not logged in');
    });

    it('should use default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('ForbiddenError', () => {
    it('should have status code 403', () => {
      const error = new ForbiddenError('Access denied');

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
    });

    it('should use default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
    });
  });

  describe('NotFoundError', () => {
    it('should have status code 404', () => {
      const error = new NotFoundError('User');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should use default resource name', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
    });
  });

  describe('ConflictError', () => {
    it('should have status code 409', () => {
      const error = new ConflictError('Email already exists');

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
    });

    it('should use default message', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Conflict');
    });
  });

  describe('InternalServerError', () => {
    it('should have status code 500', () => {
      const error = new InternalServerError('Database connection failed');

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Database connection failed');
    });

    it('should be non-operational by default', () => {
      const error = new InternalServerError();

      expect(error.isOperational).toBe(false);
    });

    it('should use default message', () => {
      const error = new InternalServerError();

      expect(error.message).toBe('Internal Server Error');
    });
  });

  describe('Error Inheritance', () => {
    it('should all inherit from ApiError', () => {
      const errors = [
        new BadRequestError(),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new InternalServerError(),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('should have correct error names', () => {
      expect(new BadRequestError().name).toBe('BadRequestError');
      expect(new UnauthorizedError().name).toBe('UnauthorizedError');
      expect(new ForbiddenError().name).toBe('ForbiddenError');
      expect(new NotFoundError().name).toBe('NotFoundError');
      expect(new ConflictError().name).toBe('ConflictError');
      expect(new InternalServerError().name).toBe('InternalServerError');
    });
  });

  describe('Error Stack Traces', () => {
    it('should capture stack traces', () => {
      const error = new ApiError('Test', 500);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });
});

