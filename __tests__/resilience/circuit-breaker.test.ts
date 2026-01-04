/**
 * Circuit Breaker Tests
 *
 * Tests the circuit breaker pattern implementation for external services.
 * Verifies that the circuit opens after failures and recovers correctly.
 */

import {
  healthService,
  recordServiceFailure,
  recordServiceSuccess,
  resetCircuitBreaker,
} from '@/lib/services/health.service';

describe('Circuit Breaker', () => {
  // Use a predefined service that getCircuitBreakerStates() returns
  const testService = 'stripe';

  beforeEach(async () => {
    // Reset circuit breaker state before each test
    await resetCircuitBreaker(testService);
  });

  describe('Failure Tracking', () => {
    it('should track service failures', async () => {
      // Record a failure
      await recordServiceFailure(testService, new Error('Test error'));

      // Service health should reflect the failure
      const health = healthService.getServiceHealth();
      const serviceStatus = health[testService];

      expect(serviceStatus).toBeDefined();
      expect(serviceStatus.healthy).toBe(false);
      expect(serviceStatus.consecutiveFailures).toBeGreaterThan(0);
    });

    it('should reset failure count on success', async () => {
      // First, record some failures
      await recordServiceFailure(testService, new Error('Error 1'));
      await recordServiceFailure(testService, new Error('Error 2'));

      // Then record a success
      await recordServiceSuccess(testService);

      // Verify failures are reset
      const health = healthService.getServiceHealth();
      const serviceStatus = health[testService];

      expect(serviceStatus.healthy).toBe(true);
      expect(serviceStatus.consecutiveFailures).toBe(0);
    });
  });

  describe('Circuit Opening', () => {
    it('should open circuit after 5 consecutive failures', async () => {
      // Record 5 failures (default threshold)
      for (let i = 0; i < 5; i++) {
        await recordServiceFailure(testService, new Error(`Failure ${i + 1}`));
      }

      // Get circuit breaker states
      const states = await healthService.getCircuitBreakerStates();
      const circuitState = states[testService];

      // Circuit should be open
      expect(circuitState).toBeDefined();
      expect(circuitState.isOpen).toBe(true);
      expect(circuitState.failureCount).toBeGreaterThanOrEqual(5);
    });

    it('should keep circuit closed with fewer than threshold failures', async () => {
      // Record 4 failures (less than threshold of 5)
      for (let i = 0; i < 4; i++) {
        await recordServiceFailure(testService, new Error(`Failure ${i + 1}`));
      }

      // Get circuit breaker states
      const states = await healthService.getCircuitBreakerStates();
      const circuitState = states[testService];

      // Circuit should still be closed
      expect(circuitState.isOpen).toBe(false);
      expect(circuitState.failureCount).toBe(4);
    });
  });

  describe('Circuit Recovery', () => {
    it('should close circuit after manual reset', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await recordServiceFailure(testService, new Error(`Failure ${i + 1}`));
      }

      // Verify circuit is open
      let states = await healthService.getCircuitBreakerStates();
      expect(states[testService].isOpen).toBe(true);

      // Reset the circuit
      await resetCircuitBreaker(testService);

      // Verify circuit is closed
      states = await healthService.getCircuitBreakerStates();
      expect(states[testService].isOpen).toBe(false);
    });

    it('should close circuit after successful probe', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await recordServiceFailure(testService, new Error(`Failure ${i + 1}`));
      }

      // Wait for half-open state (in real scenario, would wait for timeout)
      // Record a success (simulating successful probe)
      await recordServiceSuccess(testService);

      // Verify circuit is closed
      const states = await healthService.getCircuitBreakerStates();
      expect(states[testService].isOpen).toBe(false);
    });
  });

  describe('Service Availability Checks', () => {
    it('should report Stripe as unavailable when circuit is open', async () => {
      // Open the Stripe circuit
      for (let i = 0; i < 5; i++) {
        await recordServiceFailure('stripe', new Error(`Stripe failure ${i + 1}`));
      }

      // Check availability
      const isAvailable = await healthService.isStripeAvailable();
      expect(isAvailable).toBe(false);

      // Clean up
      await resetCircuitBreaker('stripe');
    });

    it('should report database as unavailable when circuit is open', async () => {
      // Open the database circuit
      for (let i = 0; i < 5; i++) {
        await recordServiceFailure('database', new Error(`DB failure ${i + 1}`));
      }

      // Check availability
      const isAvailable = await healthService.isDatabaseAvailable();
      expect(isAvailable).toBe(false);

      // Clean up
      await resetCircuitBreaker('database');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations up to maxRetries', async () => {
      let attemptCount = 0;

      const failingOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return 'success';
      };

      const result = await healthService.withRetry(failingOperation, 'test-retry', 3);

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should throw after maxRetries exhausted', async () => {
      let attemptCount = 0;

      const alwaysFailingOperation = async () => {
        attemptCount++;
        throw new Error(`Attempt ${attemptCount} failed`);
      };

      await expect(
        healthService.withRetry(alwaysFailingOperation, 'test-fail', 3)
      ).rejects.toThrow('Attempt 3 failed');

      expect(attemptCount).toBe(3);
    });
  });

  describe('Comprehensive Health', () => {
    it('should return comprehensive health data', async () => {
      const health = await healthService.getComprehensiveHealth();

      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('circuitBreakers');
      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('timestamp');
      expect(health.redis).toHaveProperty('available');
      expect(health.redis).toHaveProperty('mode');
    });
  });
});

describe('Service Unavailable Response', () => {
  it('should return properly formatted unavailable response', () => {
    const response = healthService.serviceUnavailableResponse('Test Service');

    expect(response.success).toBe(false);
    expect(response.error).toContain('Test Service');
    expect(response.code).toBe('SERVICE_UNAVAILABLE');
    expect(response.retryAfter).toBe(30);
  });
});
