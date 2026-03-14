'use client'

import { useState } from 'react'

export default function DriverLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || data.message || 'Login failed. Please check your credentials.')
        return
      }

      window.location.href = data.data?.redirectTo || '/driver-portal/dashboard'
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1E3A5F] py-8 px-6 text-center">
        <div className="inline-block w-1 h-8 bg-[#B87333] mr-3 align-middle" />
        <h1 className="inline text-2xl font-bold text-white align-middle">Driver Login</h1>
        <p className="mt-2 text-[#BCCCDC] text-sm">Walla Walla Wine Tours</p>
      </div>

      {/* Form card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent disabled:opacity-60"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent disabled:opacity-60"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg font-medium text-white bg-[#1E3A5F] hover:bg-[#1A3354] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
