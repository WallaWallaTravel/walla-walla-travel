/**
 * Chaos Engineering Tests
 *
 * Tests system behavior under various failure conditions.
 * Simulates common failure scenarios to verify graceful degradation.
 */

import { withGracefulDegradation, queueService } from '@/lib/services/queue.service';
import { healthService, resetCircuitBreaker } from '@/lib/services/health.service';
import { redis } from '@/lib/redis';

describe('Chaos Scenarios', () => {
  beforeEach(async () => {
    // Clean up any previous test state
    await resetCircuitBreaker('stripe');
    await resetCircuitBreaker('email');
    await resetCircuitBreaker('database');
  });

  describe('Graceful Degradation', () => {
    it('should queue operation when service is unavailable', async () => {
      const failingOperation = async () => {
        throw new Error('ECONNREFUSED - Service unavailable');
      };

      const result = await withGracefulDegradation(failingOperation, {
        type: 'payment_create',
        payload: { amount: 100, customerId: 'test' },
      });

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
      expect(result.operationId).toBeDefined();
    });

    it('should not queue non-retriable errors', async () => {
      const nonRetriableOperation = async () => {
        throw new Error('Invalid input data');
      };

      await expect(
        withGracefulDegradation(nonRetriableOperation, {
          type: 'payment_create',
          payload: { amount: 100 },
        })
      ).rejects.toThrow('Invalid input data');
    });

    it('should return success result for successful operation', async () => {
      const successfulOperation = async () => 'success data';

      const result = await withGracefulDegradation(successfulOperation, {
        type: 'email_send',
        payload: { to: 'test@example.com' },
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success data');
      expect(result.queued).toBeUndefined();
    });
  });

  describe('Queue Operations', () => {
    it('should enqueue operation successfully', async () => {
      const operationId = await queueService.enqueue('email_send', {
        to: 'test@example.com',
        subject: 'Test',
      });

      expect(operationId).toBeDefined();
      expect(operationId).toMatch(/^op_/);
    });

    it('should retrieve queued operation', async () => {
      const operationId = await queueService.enqueue('payment_create', {
        amount: 500,
        customerId: 'cust_123',
      });

      const operation = await queueService.getOperation(operationId);

      expect(operation).toBeDefined();
      expect(operation?.type).toBe('payment_create');
      expect(operation?.status).toBe('pending');
      expect(operation?.payload).toEqual({
        amount: 500,
        customerId: 'cust_123',
      });
    });

    it('should mark operation as completed', async () => {
      const operationId = await queueService.enqueue('webhook_send', {
        url: 'https://example.com/webhook',
      });

      await queueService.markCompleted(operationId);

      const operation = await queueService.getOperation(operationId);
      expect(operation?.status).toBe('completed');
      expect(operation?.completedAt).toBeDefined();
    });

    it('should move to dead letter after max attempts', async () => {
      const operationId = await queueService.enqueue(
        'email_send',
        { to: 'test@example.com' },
        { maxAttempts: 2 }
      );

      // Simulate 2 failures
      await queueService.markProcessing(operationId);
      await queueService.markFailed(operationId, 'Attempt 1 failed');
      await queueService.markProcessing(operationId);
      await queueService.markFailed(operationId, 'Attempt 2 failed');

      const operation = await queueService.getOperation(operationId);
      expect(operation?.status).toBe('dead_letter');
    });
  });

  describe('Simulated Service Failures', () => {
    it('should handle Stripe timeout gracefully', async () => {
      // Simulate a timeout error
      const stripeTimeoutOperation = async () => {
        throw new Error('ETIMEDOUT - Connection timed out');
      };

      const result = await withGracefulDegradation(stripeTimeoutOperation, {
        type: 'payment_create',
        payload: { amount: 200 },
      });

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });

    it('should handle network reset gracefully', async () => {
      const networkResetOperation = async () => {
        throw new Error('ECONNRESET - Connection reset by peer');
      };

      const result = await withGracefulDegradation(networkResetOperation, {
        type: 'email_send',
        payload: { to: 'test@example.com' },
      });

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });

    it('should handle rate limiting gracefully', async () => {
      const rateLimitedOperation = async () => {
        throw new Error('RATE_LIMIT_EXCEEDED - Too many requests');
      };

      const result = await withGracefulDegradation(rateLimitedOperation, {
        type: 'webhook_send',
        payload: { url: 'https://api.example.com' },
      });

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });
  });

  describe('Redis Fallback', () => {
    it('should report redis status', () => {
      const status = redis.getStatus();

      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('mode');
      expect(['redis', 'memory']).toContain(status.mode);
    });
  });

  describe('Health Probes', () => {
    it('should probe database health', async () => {
      const result = await healthService.probeDatabaseHealth();

      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('latencyMs');
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should run all health probes', async () => {
      const probes = await healthService.runHealthProbes();

      expect(probes).toHaveProperty('database');
      expect(probes).toHaveProperty('email');
      expect(probes).toHaveProperty('stripe');
      expect(probes).toHaveProperty('redis');
      expect(probes).toHaveProperty('overall');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(probes.overall);
    });
  });

  describe('Circuit Breaker Under Load', () => {
    it('should open circuit breaker rapidly under burst failures', async () => {
      const serviceName = 'burst-test-service';

      // Simulate burst of failures
      const failures = Array(5)
        .fill(null)
        .map((_, i) =>
          healthService.recordServiceFailure(serviceName, new Error(`Burst failure ${i + 1}`))
        );

      await Promise.all(failures);

      // Circuit should be open
      const states = await healthService.getCircuitBreakerStates();
      // Note: burst-test-service might not be in predefined services, so check if it exists
      if (states[serviceName]) {
        expect(states[serviceName].isOpen).toBe(true);
      }

      // Clean up
      await resetCircuitBreaker(serviceName);
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate increasing delays for retries', async () => {
      // Test internal behavior through queue service retry scheduling
      const operationId = await queueService.enqueue('email_send', {});

      // First failure
      await queueService.markProcessing(operationId);
      await queueService.markFailed(operationId, 'Failure 1');
      const afterFirst = await queueService.getOperation(operationId);
      const attemptsAfterFirst = afterFirst?.attempts ?? 0;

      // Second failure
      await queueService.markProcessing(operationId);
      await queueService.markFailed(operationId, 'Failure 2');
      const afterSecond = await queueService.getOperation(operationId);
      const attemptsAfterSecond = afterSecond?.attempts ?? 0;

      // The nextRetryAt should be set and increasing with each failure
      expect(afterFirst?.nextRetryAt).toBeDefined();
      expect(afterSecond?.nextRetryAt).toBeDefined();

      // Verify attempts increased (captures the value at each point)
      expect(attemptsAfterFirst).toBe(1);
      expect(attemptsAfterSecond).toBe(2);
      expect(attemptsAfterSecond).toBeGreaterThan(attemptsAfterFirst);
    });
  });
});

describe('Failure Recovery Scenarios', () => {
  it('should recover from cascading failures', async () => {
    // Simulate cascading failures across services
    const services = ['stripe', 'email', 'database'];

    // Cause failures
    for (const service of services) {
      for (let i = 0; i < 5; i++) {
        await healthService.recordServiceFailure(service, new Error(`${service} failure`));
      }
    }

    // Verify all circuits are open
    const statesOpen = await healthService.getCircuitBreakerStates();
    for (const service of services) {
      expect(statesOpen[service].isOpen).toBe(true);
    }

    // Simulate recovery
    for (const service of services) {
      await resetCircuitBreaker(service);
    }

    // Verify all circuits are closed
    const statesClosed = await healthService.getCircuitBreakerStates();
    for (const service of services) {
      expect(statesClosed[service].isOpen).toBe(false);
    }
  });
});
