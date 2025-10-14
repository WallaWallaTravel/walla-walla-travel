'use client'

import { useState } from 'react'
import { loginAction } from '@/app/actions/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('driver@test.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await loginAction(email, password)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // If successful, loginAction will redirect to /workflow
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '2rem',
        borderRadius: '16px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 700, 
          marginBottom: '2rem', 
          textAlign: 'center',
          color: '#1a1a1a'
        }}>
          Walla Walla Travel
        </h1>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '1rem', 
              fontWeight: 600, 
              marginBottom: '0.5rem',
              color: '#1a1a1a'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '1rem',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#1a1a1a',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '1rem', 
              fontWeight: 600, 
              marginBottom: '0.5rem',
              color: '#1a1a1a'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '1rem',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#1a1a1a',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              border: '2px solid #fca5a5',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: loading ? '#9ca3af' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          border: '2px solid #e5e7eb',
        }}>
          <p style={{ margin: 0, fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.95rem', color: '#1a1a1a' }}>
            Test Credentials:
          </p>
          <p style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.95rem', color: '#374151' }}>
            <strong>Email:</strong> driver@test.com
          </p>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#374151' }}>
            <strong>Password:</strong> test123456
          </p>
        </div>
      </div>
    </div>
  )
}
