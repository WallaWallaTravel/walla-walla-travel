'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'

interface SocialAccount {
  id: number
  platform: string
  account_name: string
  account_username: string
  buffer_profile_id: string
  avatar_url: string | null
  connection_status: 'connected' | 'disconnected' | 'expired' | 'error'
  last_sync_at: string | null
  last_error: string | null
  is_active: boolean
  created_at: string
}

function MarketingSettingsContent() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<number | null>(null)

  // Check for URL params (success/error from OAuth)
  useEffect(() => {
    const urlError = searchParams.get('error')
    const urlSuccess = searchParams.get('success')

    if (urlError) {
      setError(urlError.replace(/_/g, ' '))
    }
    if (urlSuccess) {
      setSuccess(urlSuccess.replace(/_/g, ' '))
      // Clear success after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    }
  }, [searchParams])

  // Fetch connected accounts
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch('/api/admin/marketing/social-accounts')
        if (response.ok) {
          const data = await response.json()
          setAccounts(data.accounts || [])
        }
      } catch {
        setError('Failed to load connected accounts')
      } finally {
        setLoading(false)
      }
    }
    fetchAccounts()
  }, [])

  const handleDisconnect = async (accountId: number) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return

    setDisconnecting(accountId)
    try {
      const response = await fetch('/api/admin/marketing/social-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId }),
      })

      if (response.ok) {
        setAccounts(accounts.filter(a => a.id !== accountId))
        setSuccess('Account disconnected successfully')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        throw new Error('Failed to disconnect account')
      }
    } catch {
      setError('Failed to disconnect account')
    } finally {
      setDisconnecting(null)
    }
  }

  const getPlatformInfo = (platform: string) => {
    const platforms: Record<string, { emoji: string; color: string; name: string }> = {
      instagram: { emoji: '📸', color: 'bg-gradient-to-br from-purple-500 to-pink-500', name: 'Instagram' },
      facebook: { emoji: '👥', color: 'bg-blue-600', name: 'Facebook' },
      linkedin: { emoji: '💼', color: 'bg-blue-700', name: 'LinkedIn' },
      twitter: { emoji: '🐦', color: 'bg-sky-500', name: 'Twitter/X' },
      pinterest: { emoji: '📌', color: 'bg-red-600', name: 'Pinterest' },
      tiktok: { emoji: '🎵', color: 'bg-black', name: 'TikTok' },
    }
    return platforms[platform] || { emoji: '🔗', color: 'bg-gray-500', name: platform }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      connected: { bg: 'bg-green-100', text: 'text-green-700', label: 'Connected' },
      disconnected: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Disconnected' },
      expired: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Token Expired' },
      error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
    }
    return styles[status] || styles.disconnected
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
            <span>/</span>
            <span>Settings</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Marketing Settings</h1>
          <p className="text-gray-600 mt-1">Manage connected social media accounts and integrations</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
            <span>✓ {success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              Dismiss
            </button>
          </div>
        )}

        {/* Buffer Connection */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Buffer Integration</h2>
                <p className="text-sm text-gray-500">Connect your Buffer account to schedule posts to multiple platforms</p>
              </div>
            </div>
            <a
              href="/api/auth/buffer"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 flex items-center gap-2"
            >
              <span>+</span> Connect Buffer
            </a>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">How it works:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>1. Connect your Buffer account (requires Buffer Essentials plan or higher)</li>
              <li>2. Link your social media profiles in Buffer</li>
              <li>3. Schedule posts here - they'll be sent to Buffer's queue automatically</li>
              <li>4. Buffer handles the actual posting at the scheduled time</li>
            </ul>
          </div>

          {!process.env.NEXT_PUBLIC_BUFFER_CONFIGURED && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Configuration needed:</span> Set BUFFER_CLIENT_ID and BUFFER_CLIENT_SECRET environment variables.
                <a href="https://buffer.com/developers" target="_blank" rel="noopener noreferrer" className="ml-1 text-yellow-700 underline">
                  Get Buffer API credentials →
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Connected Accounts */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Connected Accounts</h2>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🔗</div>
              <p className="text-lg font-medium text-gray-700 mb-2">No accounts connected</p>
              <p className="text-sm">Connect Buffer to link your social media profiles</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map(account => {
                const platformInfo = getPlatformInfo(account.platform)
                const statusInfo = getStatusBadge(account.connection_status)

                return (
                  <div key={account.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    {/* Avatar/Platform Icon */}
                    <div className="relative">
                      {account.avatar_url ? (
                        <img
                          src={account.avatar_url}
                          alt={account.account_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className={`w-12 h-12 ${platformInfo.color} rounded-lg flex items-center justify-center`}>
                          <span className="text-xl text-white">{platformInfo.emoji}</span>
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${platformInfo.color} rounded-full flex items-center justify-center border-2 border-white`}>
                        <span className="text-xs">{platformInfo.emoji}</span>
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{account.account_name || account.account_username}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {platformInfo.name}
                        {account.last_sync_at && (
                          <span className="ml-2">
                            • Last synced {format(new Date(account.last_sync_at), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </p>
                      {account.last_error && (
                        <p className="text-xs text-red-600 mt-1">{account.last_error}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {account.connection_status === 'expired' && (
                        <a
                          href="/api/auth/buffer"
                          className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                        >
                          Reconnect
                        </a>
                      )}
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        disabled={disconnecting === account.id}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      >
                        {disconnecting === account.id ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pricing Note */}
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Buffer Pricing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-medium text-gray-900">Buffer Essentials</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">$15<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="text-sm text-gray-600 mt-3 space-y-1">
                <li>• Unlimited posts</li>
                <li>• 1 user</li>
                <li>• Connect multiple channels</li>
                <li>• Publishing queue</li>
              </ul>
            </div>
            <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900">Recommended Setup</h3>
              <p className="text-sm text-purple-700 mt-2">
                Buffer Essentials ($15/mo) is the most cost-effective option for a one-person operation.
                It includes all the features needed for scheduling posts to Instagram, Facebook, and LinkedIn.
              </p>
              <a
                href="https://buffer.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-sm text-purple-600 hover:text-purple-700"
              >
                View Buffer pricing →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MarketingSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-24 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <MarketingSettingsContent />
    </Suspense>
  )
}
