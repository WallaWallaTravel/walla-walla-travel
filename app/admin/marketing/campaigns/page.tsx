'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Campaign {
  id: number
  name: string
  description: string | null
  theme: string | null
  status: string
  start_date: string | null
  end_date: string | null
  channels: string[]
  target_audience: string | null
  auto_generated: boolean
  items_count: string
  published_count: string
  created_by_name: string | null
  created_at: string
  updated_at: string
}

interface CampaignItem {
  id: number
  campaign_id: number
  channel: string
  item_type: string
  content: string
  subject_line: string | null
  scheduled_for: string | null
  status: string
  scheduled_post_id: number | null
  created_at: string
}

interface CreateCampaignForm {
  name: string
  theme: string
  channels: string[]
  startDate: string
  endDate: string
  targetAudience: string
}

const CHANNEL_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  instagram: { label: 'Instagram', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  facebook: { label: 'Facebook', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  linkedin: { label: 'LinkedIn', color: 'text-sky-700', bgColor: 'bg-sky-100' },
  email: { label: 'Email', color: 'text-amber-700', bgColor: 'bg-amber-100' },
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
}

const ITEM_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-indigo-100 text-indigo-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-50 text-red-600',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignItems, setCampaignItems] = useState<CampaignItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [form, setForm] = useState<CreateCampaignForm>({
    name: '',
    theme: '',
    channels: ['instagram'],
    startDate: '',
    endDate: '',
    targetAudience: '',
  })

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)

      const res = await fetch(`/api/admin/marketing/campaigns?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to load campaigns')
      }
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const fetchCampaignDetail = async (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setLoadingItems(true)
    setCampaignItems([])
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaign.id}`)
      if (!res.ok) throw new Error('Failed to load campaign details')
      const data = await res.json()
      setSelectedCampaign(data.campaign)
      setCampaignItems(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign details')
    } finally {
      setLoadingItems(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.theme.trim() || !form.startDate || !form.endDate) {
      setError('Please fill in all required fields')
      return
    }
    if (form.channels.length === 0) {
      setError('Please select at least one channel')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to create campaign')
      }

      setShowCreateModal(false)
      setForm({
        name: '',
        theme: '',
        channels: ['instagram'],
        startDate: '',
        endDate: '',
        targetAudience: '',
      })
      fetchCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  const handleApprove = async (campaignId: number) => {
    setActionLoading(`approve-${campaignId}`)
    setError(null)
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/approve`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to approve campaign')
      }
      fetchCampaigns()
      if (selectedCampaign?.id === campaignId) {
        const updatedCampaign = { ...selectedCampaign, status: 'scheduled' }
        setSelectedCampaign(updatedCampaign as Campaign)
        fetchCampaignDetail(updatedCampaign as Campaign)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve campaign')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (campaignId: number) => {
    if (!confirm('Are you sure you want to cancel this campaign?')) return

    setActionLoading(`cancel-${campaignId}`)
    setError(null)
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to cancel campaign')
      }
      fetchCampaigns()
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign(null)
        setCampaignItems([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel campaign')
    } finally {
      setActionLoading(null)
    }
  }

  const toggleChannel = (channel: string) => {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
    }))
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">
                Marketing
              </Link>
              <span>/</span>
              <span className="text-gray-900">Campaigns</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Campaign Orchestration
            </h1>
            <p className="text-gray-700 mt-1">
              Create and manage multi-channel marketing campaigns with AI-generated content
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 shadow-sm"
          >
            Create Campaign
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-1 text-sm text-red-600 underline hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <span className="text-sm text-gray-600">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex gap-6">
          {/* Campaign List */}
          <div className={selectedCampaign ? 'w-1/2' : 'w-full'}>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-20" />
                      <div className="h-6 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-gray-700 mb-4">
                  Create your first multi-channel campaign to get started.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                >
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map(campaign => (
                  <div
                    key={campaign.id}
                    onClick={() => fetchCampaignDetail(campaign)}
                    className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${
                      selectedCampaign?.id === campaign.id
                        ? 'border-purple-300 ring-1 ring-purple-200'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {campaign.name}
                        </h3>
                        {campaign.theme && (
                          <p className="text-sm text-gray-700 mt-0.5 truncate">
                            {campaign.theme}
                          </p>
                        )}
                      </div>
                      <span
                        className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          STATUS_STYLES[campaign.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
                      <span>
                        {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                      </span>
                      <span>{campaign.items_count} items</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {campaign.channels?.map(channel => {
                        const info = CHANNEL_INFO[channel]
                        return info ? (
                          <span
                            key={channel}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${info.bgColor} ${info.color}`}
                          >
                            {info.label}
                          </span>
                        ) : null
                      })}
                    </div>

                    {campaign.status === 'draft' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApprove(campaign.id)
                          }}
                          disabled={actionLoading === `approve-${campaign.id}`}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === `approve-${campaign.id}`
                            ? 'Approving...'
                            : 'Approve'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCancel(campaign.id)
                          }}
                          disabled={actionLoading === `cancel-${campaign.id}`}
                          className="px-3 py-1.5 text-red-600 text-sm font-medium hover:text-red-800"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campaign Detail Panel */}
          {selectedCampaign && (
            <div className="w-1/2">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm sticky top-6">
                {/* Detail Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedCampaign.name}
                      </h2>
                      {selectedCampaign.theme && (
                        <p className="text-sm text-gray-700 mt-0.5">
                          {selectedCampaign.theme}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCampaign(null)
                        setCampaignItems([])
                      }}
                      className="ml-3 p-1 text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[selectedCampaign.status] || STATUS_STYLES.draft
                      }`}
                    >
                      {selectedCampaign.status}
                    </span>
                    <span className="text-sm text-gray-700">
                      {formatDate(selectedCampaign.start_date)} -{' '}
                      {formatDate(selectedCampaign.end_date)}
                    </span>
                    {selectedCampaign.target_audience && (
                      <span className="text-sm text-gray-600">
                        Audience: {selectedCampaign.target_audience}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {selectedCampaign.channels?.map(channel => {
                      const info = CHANNEL_INFO[channel]
                      return info ? (
                        <span
                          key={channel}
                          className={`px-2 py-0.5 rounded text-xs font-medium ${info.bgColor} ${info.color}`}
                        >
                          {info.label}
                        </span>
                      ) : null
                    })}
                  </div>

                  {selectedCampaign.status === 'draft' && (
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => handleApprove(selectedCampaign.id)}
                        disabled={actionLoading === `approve-${selectedCampaign.id}`}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === `approve-${selectedCampaign.id}`
                          ? 'Approving...'
                          : 'Approve & Schedule'}
                      </button>
                      <button
                        onClick={() => handleCancel(selectedCampaign.id)}
                        disabled={actionLoading === `cancel-${selectedCampaign.id}`}
                        className="px-4 py-2 text-red-600 text-sm font-medium hover:text-red-800"
                      >
                        Cancel Campaign
                      </button>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="p-5 max-h-[600px] overflow-y-auto">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Content Items ({campaignItems.length})
                  </h3>

                  {loadingItems ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                          <div className="h-16 bg-gray-100 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : campaignItems.length === 0 ? (
                    <p className="text-sm text-gray-600 py-4">
                      No content items generated yet. If AI generation failed, you can re-create the campaign.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {campaignItems.map(item => {
                        const channelInfo = CHANNEL_INFO[item.channel]
                        return (
                          <div
                            key={item.id}
                            className="border border-gray-100 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {channelInfo && (
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${channelInfo.bgColor} ${channelInfo.color}`}
                                  >
                                    {channelInfo.label}
                                  </span>
                                )}
                                <span className="text-xs text-gray-600">
                                  {item.item_type === 'email_blast' ? 'Email' : 'Social Post'}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  ITEM_STATUS_STYLES[item.status] || ITEM_STATUS_STYLES.draft
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>

                            {item.subject_line && (
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                {item.subject_line}
                              </p>
                            )}

                            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                              {item.content}
                            </p>

                            <p className="text-xs text-gray-600 mt-2">
                              {formatDateTime(item.scheduled_for)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create Campaign</h2>
              <p className="text-sm text-gray-700 mt-1">
                AI will generate content for each channel and day of your campaign.
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Spring Wine Trail Promotion"
                />
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Theme / Message
                </label>
                <textarea
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Promote spring wine tasting experiences, vineyard tours, and seasonal events in Walla Walla Valley..."
                />
              </div>

              {/* Channels */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Channels
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CHANNEL_INFO).map(([key, info]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleChannel(key)}
                      className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                        form.channels.includes(key)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Target Audience
                  <span className="text-gray-600 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Wine enthusiasts, couples planning getaways..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {creating ? 'Generating Content...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
