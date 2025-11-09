'use client';

import { useState } from 'react';

export default function AIDiagnosticsPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Check visitor tracking
    try {
      const visitorRes = await fetch('/api/visitor/capture-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_uuid: crypto.randomUUID(),
          email: 'test@example.com',
          name: 'Test User',
          trigger_type: 'diagnostic'
        })
      });
      diagnostics.tests.visitorTracking = {
        status: visitorRes.ok ? 'PASS' : 'FAIL',
        statusCode: visitorRes.status,
        response: await visitorRes.json()
      };
    } catch (error: any) {
      diagnostics.tests.visitorTracking = {
        status: 'ERROR',
        error: error.message
      };
    }

    // Test 2: Check AI query endpoint
    try {
      const aiRes = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' })
      });
      const aiData = await aiRes.json();
      diagnostics.tests.aiQuery = {
        status: aiRes.ok ? 'PASS' : 'FAIL',
        statusCode: aiRes.status,
        response: aiData
      };
    } catch (error: any) {
      diagnostics.tests.aiQuery = {
        status: 'ERROR',
        error: error.message
      };
    }

    // Test 3: Check environment
    diagnostics.environment = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine
    };

    setResults(diagnostics);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">🔍 AI Directory Diagnostics</h1>
          
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Running Tests...' : 'Run Diagnostics'}
          </button>

          {results && (
            <div className="mt-6 space-y-4">
              <div className="border rounded-lg p-4">
                <h2 className="font-bold mb-2">Test Results:</h2>
                
                {/* Visitor Tracking Test */}
                <div className="mb-4">
                  <h3 className="font-semibold">1. Visitor Tracking:</h3>
                  <div className={`ml-4 ${results.tests.visitorTracking.status === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                    Status: {results.tests.visitorTracking.status}
                  </div>
                  {results.tests.visitorTracking.error && (
                    <div className="ml-4 text-red-600 text-sm">
                      Error: {results.tests.visitorTracking.error}
                    </div>
                  )}
                </div>

                {/* AI Query Test */}
                <div className="mb-4">
                  <h3 className="font-semibold">2. AI Query:</h3>
                  <div className={`ml-4 ${results.tests.aiQuery.status === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                    Status: {results.tests.aiQuery.status}
                  </div>
                  {results.tests.aiQuery.error && (
                    <div className="ml-4 text-red-600 text-sm">
                      Error: {results.tests.aiQuery.error}
                    </div>
                  )}
                  {results.tests.aiQuery.response?.error && (
                    <div className="ml-4 text-red-600 text-sm">
                      API Error: {results.tests.aiQuery.response.error}
                    </div>
                  )}
                  {results.tests.aiQuery.response?.details && (
                    <div className="ml-4 text-red-600 text-sm">
                      Details: {results.tests.aiQuery.response.details}
                    </div>
                  )}
                </div>
              </div>

              <details className="border rounded-lg p-4">
                <summary className="font-bold cursor-pointer">Full Response (click to expand)</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

