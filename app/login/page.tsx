'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// Portal configuration for branding
const portalConfig = {
  admin: {
    name: 'Admin Portal',
    tagline: 'Manage bookings and operations',
    icon: '⚙️',
    primaryColor: '#1E3A5F',
    secondaryColor: '#D9E2EC',
    bgColor: 'bg-slate-50',
    redirectTo: '/admin/dashboard',
  },
  driver: {
    name: 'Driver Portal',
    tagline: 'Access your tours and schedule',
    icon: '🚗',
    primaryColor: '#B87333',
    secondaryColor: '#FAEDE0',
    bgColor: 'bg-[#FDF8F3]',
    redirectTo: '/driver-portal/dashboard',
  },
  partners: {
    name: 'Partner Portal',
    tagline: 'Manage your business listing',
    icon: '🤝',
    primaryColor: '#059669',
    secondaryColor: '#D1FAE5',
    bgColor: 'bg-emerald-50',
    redirectTo: '/partner-portal/dashboard',
  },
}

type PortalType = keyof typeof portalConfig

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Determine which portal we're logging into
  const portalParam = searchParams.get('portal') || 'admin'
  const portal: PortalType = (portalParam in portalConfig) ? portalParam as PortalType : 'admin'
  const config = portalConfig[portal]

  // Check for error from URL params
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError === 'forbidden') {
      setError('You do not have permission to access that page')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Use explicit redirect from URL, or role-based default
        const customRedirect = searchParams.get('redirect')
        let redirectTo = customRedirect || data.data?.redirectTo
        
        // Override redirect based on user role
        const userRole = data.data?.user?.role
        if (userRole === 'admin') {
          redirectTo = customRedirect || '/admin/dashboard'
        } else if (userRole === 'driver') {
          redirectTo = customRedirect || '/driver-portal/dashboard'
        } else if (userRole === 'partner') {
          redirectTo = customRedirect || '/partner-portal/dashboard'
        }
        
        router.push(redirectTo)
        router.refresh()
      } else {
        setError(data.error?.message || data.message || 'Invalid email or password')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${config.bgColor}`}>
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-slate-200">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to portals
        </Link>

        {/* Portal Badge */}
        <div 
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-4"
          style={{ backgroundColor: config.secondaryColor, color: config.primaryColor }}
        >
          {config.icon} {config.name}
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Sign In
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {config.tagline}
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-5">
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:outline-none transition-colors focus:ring-2"
              style={{ 
                '--tw-ring-color': config.secondaryColor,
              } as React.CSSProperties}
              onFocus={(e) => e.target.style.borderColor = config.primaryColor}
              onBlur={(e) => e.target.style.borderColor = ''}
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-5">
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:outline-none transition-colors focus:ring-2"
              style={{ 
                '--tw-ring-color': config.secondaryColor,
              } as React.CSSProperties}
              onFocus={(e) => e.target.style.borderColor = config.primaryColor}
              onBlur={(e) => e.target.style.borderColor = ''}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-5 text-sm font-medium border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-white font-semibold transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: loading ? undefined : config.primaryColor,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Switch Portal Links */}
        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Other portals</p>
          <div className="flex justify-center gap-4 text-sm">
            {portal !== 'admin' && (
              <Link href="/login?portal=admin" className="text-[#1E3A5F] font-medium hover:underline">
                Admin
              </Link>
            )}
            {portal !== 'driver' && (
              <Link href="/login?portal=driver" className="text-[#B87333] font-medium hover:underline">
                Driver
              </Link>
            )}
            {portal !== 'partners' && (
              <Link href="/login?portal=partners" className="text-[#059669] font-medium hover:underline">
                Partner
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
