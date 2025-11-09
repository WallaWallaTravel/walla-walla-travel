'use client';

import { useState } from 'react';

export default function SimpleAITestPage() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAIQuery = async () => {
    console.log('🔵 Button clicked!');
    setLoading(true);
    setStatus('Testing AI query...');
    setError(null);
    setResponse(null);

    try {
      console.log('🔵 Sending fetch request...');
      
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'What wineries have outdoor seating?' })
      });

      console.log('🔵 Response status:', res.status);
      
      const data = await res.json();
      console.log('🔵 Response data:', data);

      if (res.ok) {
        setStatus('✅ SUCCESS!');
        setResponse(data);
      } else {
        setStatus('❌ Failed');
        setError(data.error || data.details || 'Unknown error');
        setResponse(data);
      }
    } catch (err: any) {
      console.error('🔴 Error:', err);
      setStatus('❌ Error occurred');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6">🧪 Simple AI Test</h1>
        
        {/* Status */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-lg font-semibold">{status}</p>
          {loading && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
        </div>

        {/* Test Button */}
        <button
          onClick={testAIQuery}
          disabled={loading}
          className="w-full px-6 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Testing...' : 'Test AI Query'}
        </button>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-sm">
          <p className="font-semibold mb-2">📝 What this tests:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Database connection</li>
            <li>OpenAI API key</li>
            <li>AI model configuration</li>
            <li>Visitor tracking</li>
          </ul>
          <p className="mt-3 text-xs text-gray-600">
            💡 Check browser console (F12) for detailed logs
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500">
            <p className="font-bold text-red-800 mb-2">❌ Error:</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="mt-6">
            <p className="font-bold mb-2">Response:</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              {response.success && response.response && (
                <div className="mb-4">
                  <p className="font-semibold text-green-600 mb-2">✅ AI Response:</p>
                  <p className="text-gray-800">{response.response}</p>
                </div>
              )}
              
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold text-sm text-gray-600 hover:text-gray-800">
                  View Full Response JSON
                </summary>
                <pre className="mt-2 text-xs bg-white p-4 rounded border overflow-auto max-h-64">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* Quick Fixes */}
        <div className="mt-8 border-t pt-6">
          <p className="font-bold mb-3">🔧 Common Fixes:</p>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-semibold mb-1">1. Missing API Key</p>
              <code className="text-xs bg-white px-2 py-1 rounded">OPENAI_API_KEY</code>
              <p className="text-gray-600 text-xs mt-1">Add to .env.local and restart server</p>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-semibold mb-1">2. Missing Database Tables</p>
              <code className="text-xs bg-white px-2 py-1 rounded">Run migrations/create-ai-tables.sql</code>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-semibold mb-1">3. No Active Model</p>
              <code className="text-xs bg-white px-2 py-1 rounded">INSERT INTO ai_settings ...</code>
              <p className="text-gray-600 text-xs mt-1">Need at least one active model config</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

