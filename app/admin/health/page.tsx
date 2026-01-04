'use client';

import { useState, useEffect, useCallback } from 'react';

interface ServiceHealth {
  available: boolean;
  latencyMs: number;
  error?: string;
  mode?: 'redis' | 'memory';
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  mode: 'redis' | 'memory';
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  requestId: string;
  checkDurationMs: number;
  services: {
    database: ServiceHealth;
    stripe: ServiceHealth;
    email: ServiceHealth;
    redis: ServiceHealth & { mode: 'redis' | 'memory' };
  };
  circuitBreakers: Record<string, CircuitBreakerState>;
  metrics: {
    responseTimes: Record<string, { current: number; status: string }>;
    dbPool: { connected: boolean; latencyMs?: number; error?: string } | null;
  };
  issues: string[];
  serviceHealth: Record<string, {
    name: string;
    healthy: boolean;
    lastCheck: string;
    lastError?: string;
    consecutiveFailures: number;
  }>;
}

export default function HealthDashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 15000); // Every 15 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchHealth]);

  const resetCircuitBreaker = async (service: string) => {
    setResetting(service);
    try {
      const res = await fetch('/api/admin/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_circuit_breaker', service }),
      });
      if (!res.ok) throw new Error('Failed to reset');
      await fetchHealth(); // Refresh data
    } catch (err) {
      alert(`Failed to reset circuit breaker: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setResetting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-50 border-green-200';
      case 'degraded': return 'bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getLatencyColor = (latency: number, type: 'db' | 'api' = 'api') => {
    const thresholds = type === 'db' ? [100, 500] : [200, 1000];
    if (latency < thresholds[0]) return 'text-green-600';
    if (latency < thresholds[1]) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health Dashboard</h1>
          <p className="text-sm text-gray-600">
            Real-time reliability monitoring and circuit breaker management
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh (15s)
          </label>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {health && (
        <>
          {/* Overall Status */}
          <div className={`p-6 rounded-xl border-2 ${getStatusBg(health.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${getStatusColor(health.status)} animate-pulse`}></div>
                <div>
                  <h2 className="text-2xl font-bold capitalize">{health.status}</h2>
                  <p className="text-sm opacity-75">
                    Check completed in {health.checkDurationMs}ms
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Request ID: <code className="bg-gray-100 px-1 rounded">{health.requestId}</code></div>
                <div>{new Date(health.timestamp).toLocaleString()}</div>
              </div>
            </div>

            {health.issues.length > 0 && (
              <div className="mt-4 pt-4 border-t border-current/20">
                <h3 className="font-semibold mb-2">Active Issues:</h3>
                <ul className="space-y-1">
                  {health.issues.map((issue, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-red-500">!</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Services Grid */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Service Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Database */}
              <ServiceCard
                name="Database"
                icon="🗄️"
                available={health.services.database.available}
                latencyMs={health.services.database.latencyMs}
                error={health.services.database.error}
                latencyColor={getLatencyColor(health.services.database.latencyMs, 'db')}
              />

              {/* Stripe */}
              <ServiceCard
                name="Stripe"
                icon="💳"
                available={health.services.stripe.available}
                latencyMs={health.services.stripe.latencyMs}
                error={health.services.stripe.error}
                latencyColor={getLatencyColor(health.services.stripe.latencyMs)}
              />

              {/* Email */}
              <ServiceCard
                name="Email (Postmark)"
                icon="📧"
                available={health.services.email.available}
                latencyMs={health.services.email.latencyMs}
                error={health.services.email.error}
                latencyColor={getLatencyColor(health.services.email.latencyMs)}
              />

              {/* Redis */}
              <ServiceCard
                name="Redis"
                icon="⚡"
                available={health.services.redis.available}
                latencyMs={health.services.redis.latencyMs || 0}
                error={health.services.redis.available ? undefined : 'Using in-memory fallback'}
                latencyColor={getLatencyColor(health.services.redis.latencyMs || 0)}
                badge={health.services.redis.mode}
              />
            </div>
          </div>

          {/* Circuit Breakers */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Circuit Breakers</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failures</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(health.circuitBreakers).map(([service, state]) => (
                    <tr key={service} className={state.isOpen ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium capitalize">{service}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          state.isOpen
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {state.isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={state.failureCount > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {state.failureCount}
                        </span>
                        <span className="text-gray-400"> / 5</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded ${
                          state.mode === 'redis' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {state.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(state.isOpen || state.failureCount > 0) && (
                          <button
                            onClick={() => resetCircuitBreaker(service)}
                            disabled={resetting === service}
                            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {resetting === service ? 'Resetting...' : 'Reset'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Response Time Metrics */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Response Time Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(health.metrics.responseTimes).map(([service, data]) => (
                <div key={service} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{service}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      data.status === 'fast' ? 'bg-green-100 text-green-700' :
                      data.status === 'normal' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {data.status}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {data.current}<span className="text-lg text-gray-500">ms</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        data.status === 'fast' ? 'bg-green-500' :
                        data.status === 'normal' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (data.current / 1000) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-400">
                    <span>0ms</span>
                    <span>1000ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Health History */}
          {Object.keys(health.serviceHealth).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Service Health History</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Check</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consecutive Failures</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Error</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(health.serviceHealth).map(([key, service]) => (
                      <tr key={key} className={!service.healthy ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{service.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 ${
                            service.healthy ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {service.healthy ? '✓' : '✗'}
                            {service.healthy ? 'Healthy' : 'Unhealthy'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {new Date(service.lastCheck).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={service.consecutiveFailures > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {service.consecutiveFailures}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {service.lastError || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Reference */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold mb-3">Health Status Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1"></div>
                <div>
                  <strong>Healthy</strong>
                  <p className="text-gray-600">All services operational, no issues detected</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1"></div>
                <div>
                  <strong>Degraded</strong>
                  <p className="text-gray-600">Non-critical services down or circuit breakers open</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                <div>
                  <strong>Unhealthy</strong>
                  <p className="text-gray-600">Critical services unavailable, immediate attention needed</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ServiceCard({
  name,
  icon,
  available,
  latencyMs,
  error,
  latencyColor,
  badge,
}: {
  name: string;
  icon: string;
  available: boolean;
  latencyMs: number;
  error?: string;
  latencyColor: string;
  badge?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${
      available ? 'border-gray-200' : 'border-red-200 bg-red-50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="font-medium">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              badge === 'redis' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {badge}
            </span>
          )}
          <div className={`w-3 h-3 rounded-full ${available ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${latencyColor}`}>{latencyMs}</span>
          <span className="text-gray-500 text-sm">ms</span>
        </div>
        {error && (
          <p className="text-xs text-red-600 truncate" title={error}>{error}</p>
        )}
      </div>
    </div>
  );
}
