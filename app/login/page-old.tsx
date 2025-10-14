'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate inputs
      if (!email || !pin) {
        throw new Error('Email and PIN are required')
      }
      
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email format')
      }
      
      if (!/^\d{4}$/.test(pin)) {
        throw new Error('PIN must be 4 digits')
      }

      // Use parameterized query to prevent SQL injection
      const { data: driver, error: dbError } = await supabase
        .from('drivers')
        .select('id, email, name')
        .eq('email', email.toLowerCase())
        .eq('pin', pin)
        .single()

      if (dbError || !driver) {
        throw new Error('Invalid email or PIN')
      }

      // Create secure session
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: driver.email,
        password: pin // In production, use proper password hashing
      })

      if (authError) {
        // Fallback: Create session token
        const { error: sessionError } = await supabase
          .from('sessions')
          .insert({
            driver_id: driver.id,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        
        if (sessionError) throw sessionError
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6">Driver Login</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              autoComplete="username"
            />
          </div>
          
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}