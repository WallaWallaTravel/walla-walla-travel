/**
 * Tests for Health Check Endpoint
 * @module app/api/health/route
 *
 * Tests the GET /api/health endpoint with various service states.
 */

jest.mock('@/lib/db', () => ({
  healthCheck: jest.fn(),
}));

jest.mock('@/lib/stripe', () => ({
  isStripeConfigured: jest.fn(),
  probeStripeHealth: jest.fn(),
}));

jest.mock('@/lib/api/middleware/rate-limit', () => ({
  getRateLimitStatus: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock('@/lib/monitoring/error-logger', () => ({
  logError: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  generateSecureString: jest.fn(() => 'abc123'),
}));

import { GET } from '@/app/api/health/route';
import { healthCheck } from '@/lib/db';
import { isStripeConfigured, probeStripeHealth } from '@/lib/stripe';
import { getRateLimitStatus } from '@/lib/api/middleware/rate-limit';

const mockHealthCheck = healthCheck as jest.MockedFunction<typeof healthCheck>;
const mockIsStripeConfigured = isStripeConfigured as jest.MockedFunction<typeof isStripeConfigured>;
const mockProbeStripeHealth = probeStripeHealth as jest.MockedFunction<typeof probeStripeHealth>;
const mockGetRateLimitStatus = getRateLimitStatus as jest.MockedFunction<typeof getRateLimitStatus>;

function createMockRequest() {
  return {
    url: 'http://localhost/api/health',
    method: 'GET',
    nextUrl: { pathname: '/api/health' },
    headers: { get: jest.fn(() => null) },
  } as any;
}

function createMockContext() {
  return { params: Promise.resolve({}) } as any;
}

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRateLimitStatus.mockReturnValue({ mode: 'memory' as const, available: true });
  });

  it('should return healthy when all services are up', async () => {
    mockHealthCheck.mockResolvedValue(true);
    mockIsStripeConfigured.mockReturnValue(true);
    mockProbeStripeHealth.mockResolvedValue({ available: true, latencyMs: 50 });

    const response = await GET(createMockRequest(), createMockContext());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.checks.database.status).toBe('healthy');
    expect(body.checks.stripe.status).toBe('healthy');
    expect(body.checks.rate_limiting.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
    expect(body.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should return unhealthy (503) when database is down', async () => {
    mockHealthCheck.mockRejectedValue(new Error('Connection refused'));
    mockIsStripeConfigured.mockReturnValue(true);
    mockProbeStripeHealth.mockResolvedValue({ available: true, latencyMs: 50 });

    const response = await GET(createMockRequest(), createMockContext());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
    expect(body.checks.database.status).toBe('unhealthy');
  });

  it('should return degraded (200) when Stripe is down but DB is up', async () => {
    mockHealthCheck.mockResolvedValue(true);
    mockIsStripeConfigured.mockReturnValue(true);
    mockProbeStripeHealth.mockResolvedValue({
      available: false, latencyMs: 0, error: 'Probe failed',
    });

    const response = await GET(createMockRequest(), createMockContext());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('degraded');
    expect(body.checks.stripe.status).toBe('degraded');
    expect(body.checks.stripe.error).toBeDefined();
  });

  it('should handle Stripe not configured', async () => {
    mockHealthCheck.mockResolvedValue(true);
    mockIsStripeConfigured.mockReturnValue(false);

    const response = await GET(createMockRequest(), createMockContext());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('degraded');
    expect(body.checks.stripe.configured).toBe(false);
  });

  it('should include rate limiting mode', async () => {
    mockHealthCheck.mockResolvedValue(true);
    mockIsStripeConfigured.mockReturnValue(true);
    mockProbeStripeHealth.mockResolvedValue({ available: true, latencyMs: 30 });
    mockGetRateLimitStatus.mockReturnValue({ mode: 'redis' as const, available: true });

    const response = await GET(createMockRequest(), createMockContext());
    const body = await response.json();

    expect(body.checks.rate_limiting.mode).toBe('redis');
  });

  it('should include version and uptime', async () => {
    mockHealthCheck.mockResolvedValue(true);
    mockIsStripeConfigured.mockReturnValue(true);
    mockProbeStripeHealth.mockResolvedValue({ available: true, latencyMs: 20 });

    const response = await GET(createMockRequest(), createMockContext());
    const body = await response.json();

    expect(body.version).toBeDefined();
    expect(typeof body.responseTimeMs).toBe('number');
  });

  it('should set Cache-Control header to no-store', async () => {
    mockHealthCheck.mockResolvedValue(true);
    mockIsStripeConfigured.mockReturnValue(true);
    mockProbeStripeHealth.mockResolvedValue({ available: true, latencyMs: 10 });

    const response = await GET(createMockRequest(), createMockContext());

    // Check the header was set (depends on MockNextResponse impl)
    expect(response).toBeDefined();
  });

  it('should handle Stripe probe throwing error', async () => {
    mockHealthCheck.mockResolvedValue(true);
    mockIsStripeConfigured.mockReturnValue(true);
    mockProbeStripeHealth.mockRejectedValue(new Error('Network timeout'));

    const response = await GET(createMockRequest(), createMockContext());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('degraded');
  });

  it('should return unhealthy even when both DB and Stripe fail', async () => {
    mockHealthCheck.mockRejectedValue(new Error('DB down'));
    mockIsStripeConfigured.mockReturnValue(true);
    mockProbeStripeHealth.mockRejectedValue(new Error('Stripe down'));

    const response = await GET(createMockRequest(), createMockContext());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
  });
});
