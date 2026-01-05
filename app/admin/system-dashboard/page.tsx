'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface HealthCheck {
  type: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  duration: number;
  checks: HealthCheck[];
}

export default function SystemDashboardPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/health');
      const data = await res.json();
      setHealth(data);
      setLastUpdate(new Date());
    } catch (error) {
      logger.error('Failed to fetch system health', { error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-300';
      case 'degraded': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'down': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'down': return '❌';
      default: return '❓';
    }
  };

  const groupedChecks = health?.checks.reduce((acc, check) => {
    if (!acc[check.type]) {
      acc[check.type] = [];
    }
    acc[check.type].push(check);
    return acc;
  }, {} as Record<string, HealthCheck[]>);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔍 System Dashboard</h1>
              <p className="text-gray-600 mt-1">Real-time system health and monitoring</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {lastUpdate && (
                <span className="text-sm text-gray-500">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
              </label>
              
              <button
                onClick={fetchHealth}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh Now'}
              </button>
            </div>
          </div>

          {/* Overall Status Card */}
          {health && (
            <div className={`p-6 rounded-lg border-2 ${getStatusColor(health.status)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl">{getStatusIcon(health.status)}</span>
                    <div>
                      <h2 className="text-2xl font-bold capitalize">{health.status}</h2>
                      <p className="text-sm opacity-75">
                        System check completed in {health.duration}ms
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {health.checks.filter(c => c.status === 'healthy').length}/{health.checks.length}
                  </div>
                  <div className="text-sm opacity-75">Checks Passing</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Health Checks by Category */}
        {groupedChecks && Object.entries(groupedChecks).map(([type, checks]) => (
          <div key={type} className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
              {type.replace('_', ' ')} Checks
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checks.map((check, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getStatusIcon(check.status)}</span>
                        <h4 className="font-semibold text-gray-900">{check.name}</h4>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Response: {check.responseTime}ms
                      </p>
                    </div>
                    
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(check.status)}`}>
                      {check.status}
                    </span>
                  </div>

                  {check.error && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
                      {check.error}
                    </div>
                  )}

                  {check.metadata && Object.keys(check.metadata).length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View metadata
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(check.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/test/ai-diagnostics"
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">🧪</div>
            <h3 className="font-semibold text-gray-900 mb-1">AI Diagnostics</h3>
            <p className="text-sm text-gray-600">Test AI Directory functionality</p>
          </a>

          <a
            href="/test/ai-simple-test"
            className="block p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-1">Simple AI Test</h3>
            <p className="text-sm text-gray-600">Quick AI query test</p>
          </a>

          <a
            href="/admin/system-dashboard"
            className="block p-6 bg-blue-50 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 mb-1">System Dashboard</h3>
            <p className="text-sm text-gray-600">You are here</p>
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>System Dashboard v1.0 • Monitoring & Self-Improvement Framework</p>
        </div>
      </div>
    </div>
  );
}

