/**
 * Logger Tests
 *
 * Tests for structured logging, Sentry integration, and output formatting.
 */

import { logger, logError, logDbError, logApiRequest } from '@/lib/logger';

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const originalConsole = { ...console };

beforeEach(() => {
  jest.clearAllMocks();
  console.log = mockConsole.log;
  console.warn = mockConsole.warn;
  console.error = mockConsole.error;
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('logger', () => {
  describe('basic logging', () => {
    it('should log info messages', () => {
      logger.info('Test message');
      expect(mockConsole.log).toHaveBeenCalled();
      const output = mockConsole.log.mock.calls[0][0];
      expect(output).toContain('Test message');
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should include context in log output', () => {
      logger.info('Message with context', { userId: 123, action: 'test' });
      expect(mockConsole.log).toHaveBeenCalled();
      const output = mockConsole.log.mock.calls[0][0];
      expect(output).toContain('userId');
    });
  });

  describe('error logging with context', () => {
    it('should format error objects correctly', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', { error });
      expect(mockConsole.error).toHaveBeenCalled();
      const output = mockConsole.error.mock.calls[0][0];
      expect(output).toContain('Test error');
    });

    it('should handle non-Error objects in context', () => {
      logger.error('Operation failed', { error: 'string error' });
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('child logger', () => {
    it('should create child logger with preset context', () => {
      const childLogger = logger.child({ service: 'TestService' });
      childLogger.info('Child message', { extra: 'data' });
      expect(mockConsole.log).toHaveBeenCalled();
      const output = mockConsole.log.mock.calls[0][0];
      expect(output).toContain('service');
      expect(output).toContain('extra');
    });
  });

  describe('timing helpers', () => {
    it('should time async operations', async () => {
      const result = await logger.time(
        'Test operation',
        async () => {
          return 'success';
        },
        { context: 'test' }
      );
      expect(result).toBe('success');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should log errors for failed async operations', async () => {
      await expect(
        logger.time('Failing operation', async () => {
          throw new Error('Failed');
        })
      ).rejects.toThrow('Failed');
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should time sync operations', () => {
      const result = logger.timeSync('Sync operation', () => 42);
      expect(result).toBe(42);
    });
  });
});

describe('logError', () => {
  it('should return an error ID', () => {
    const errorId = logError('TestSource', 'Test error message');
    expect(errorId).toMatch(/^ERR-\d+-[A-Z0-9]+$/);
  });

  it('should include error ID in log output', () => {
    const errorId = logError('TestSource', 'Test error');
    expect(mockConsole.error).toHaveBeenCalled();
    const output = mockConsole.error.mock.calls[0][0];
    expect(output).toContain(errorId);
  });
});

describe('logDbError', () => {
  it('should log database errors with operation context', () => {
    const error = new Error('Connection failed');
    logDbError('INSERT', error, { table: 'users' });
    expect(mockConsole.error).toHaveBeenCalled();
    const output = mockConsole.error.mock.calls[0][0];
    expect(output).toContain('INSERT');
    expect(output).toContain('table');
  });
});

describe('logApiRequest', () => {
  it('should log API request details', () => {
    logApiRequest('GET', '/api/users', 'user-123');
    expect(mockConsole.log).toHaveBeenCalled();
    const output = mockConsole.log.mock.calls[0][0];
    expect(output).toContain('GET');
    expect(output).toContain('/api/users');
  });
});
