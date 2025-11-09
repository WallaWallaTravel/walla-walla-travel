'use client'

import { useState } from 'react'

const TEST_QUERIES = [
  "What wineries have outdoor seating?",
  "Can you recommend tours for a couple's anniversary?",
  "Do you pick up from hotels?",
  "Can you accommodate 15 people?"
]

export default function AIModelsTestPage() {
  const [query, setQuery] = useState(TEST_QUERIES[0])
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [metadata, setMetadata] = useState<any>(null)

  const handleTest = async () => {
    setIsLoading(true)
    setResponse('')
    setMetadata(null)

    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })

      const data = await res.json()

      if (data.success) {
        setResponse(data.response)
        setMetadata({
          model: data.model,
          provider: data.provider,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          cost: data.cost,
          duration: data.duration
        })
      } else {
        alert('Error: ' + data.error)
      }
    } catch (err: any) {
      console.error('Test error:', err)
      alert('Failed to test: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🤖 AI Models Test
          </h1>
          <p className="text-gray-600 mb-8">
            Test GPT-4o AI responses (multi-model support ready!)
          </p>

          {/* Query Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Test Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Ask a question..."
            />
          </div>

          {/* Suggested Queries */}
          <div className="mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Suggested Queries:
            </div>
            <div className="flex flex-wrap gap-2">
              {TEST_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(q)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Test Button */}
          <button
            onClick={handleTest}
            disabled={isLoading || !query.trim()}
            className={`w-full py-3 rounded-lg font-medium transition ${
              isLoading || !query.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Generating Response...' : 'Test AI Model'}
          </button>

          {/* Response */}
          {response && (
            <div className="mt-8 border-2 border-green-200 bg-green-50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                ✅ AI Response
              </h2>
              
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {response}
                </p>
              </div>

              {/* Metadata */}
              {metadata && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Model:</span>{' '}
                    <span className="text-gray-900">{metadata.model}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Provider:</span>{' '}
                    <span className="text-gray-900">{metadata.provider}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Input Tokens:</span>{' '}
                    <span className="text-gray-900">{metadata.inputTokens}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Output Tokens:</span>{' '}
                    <span className="text-gray-900">{metadata.outputTokens}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Cost:</span>{' '}
                    <span className="text-gray-900">${metadata.cost.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Duration:</span>{' '}
                    <span className="text-gray-900">{metadata.duration}ms</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">
              🧪 Testing Checklist
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ Multi-model provider system works</li>
              <li>✓ GPT-4o generates responses</li>
              <li>✓ Cost calculation works</li>
              <li>✓ Token counting works</li>
              <li>✓ Response time tracking works</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

