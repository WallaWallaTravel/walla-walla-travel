'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface EmailCampaign {
  id: number
  name: string
  subject: string
  preview_text: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused'
  campaign_type: 'promotional' | 'newsletter' | 'transactional' | 'drip' | 'welcome'
  scheduled_for: string | null
  sent_at: string | null
  recipients_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  unsubscribed_count: number
  created_at: string
}

interface EmailTemplate {
  id: number
  name: string
  subject: string
  category: string
  preview_html: string
}

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'campaigns' | 'templates'>('campaigns')
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    setTimeout(() => {
      setCampaigns([
        {
          id: 1,
          name: 'Holiday Wine Tour Special',
          subject: '🎄 Save 20% on Wine Tours This Holiday Season!',
          preview_text: 'Book your holiday wine adventure and save big...',
          status: 'sent',
          campaign_type: 'promotional',
          scheduled_for: null,
          sent_at: '2025-11-25T10:00:00',
          recipients_count: 2340,
          opened_count: 1287,
          clicked_count: 234,
          bounced_count: 12,
          unsubscribed_count: 3,
          created_at: '2025-11-20T14:00:00',
        },
        {
          id: 2,
          name: 'December Newsletter',
          subject: 'December at Walla Walla: New Wineries & Events',
          preview_text: 'Discover what\'s new in wine country this month...',
          status: 'scheduled',
          campaign_type: 'newsletter',
          scheduled_for: '2025-12-01T09:00:00',
          sent_at: null,
          recipients_count: 3150,
          opened_count: 0,
          clicked_count: 0,
          bounced_count: 0,
          unsubscribed_count: 0,
          created_at: '2025-11-28T11:00:00',
        },
        {
          id: 3,
          name: 'Corporate Event Outreach',
          subject: 'Plan Your Team\'s Wine Country Retreat',
          preview_text: 'Give your team an unforgettable experience...',
          status: 'draft',
          campaign_type: 'promotional',
          scheduled_for: null,
          sent_at: null,
          recipients_count: 0,
          opened_count: 0,
          clicked_count: 0,
          bounced_count: 0,
          unsubscribed_count: 0,
          created_at: '2025-11-27T16:30:00',
        },
        {
          id: 4,
          name: 'Welcome Series - Day 1',
          subject: 'Welcome to Walla Walla Travel! 🍷',
          preview_text: 'Thank you for joining us on this wine journey...',
          status: 'sent',
          campaign_type: 'welcome',
          scheduled_for: null,
          sent_at: '2025-11-26T08:00:00',
          recipients_count: 156,
          opened_count: 134,
          clicked_count: 89,
          bounced_count: 2,
          unsubscribed_count: 0,
          created_at: '2025-11-01T09:00:00',
        },
      ])

      setTemplates([
        { id: 1, name: 'Promotional Sale', subject: '[SALE] {{discount}}% Off {{service}}', category: 'promotional', preview_html: '<div>Sale template...</div>' },
        { id: 2, name: 'Monthly Newsletter', subject: '{{month}} at Walla Walla Wine Country', category: 'newsletter', preview_html: '<div>Newsletter template...</div>' },
        { id: 3, name: 'Booking Confirmation', subject: 'Your Wine Tour is Confirmed! 🍷', category: 'transactional', preview_html: '<div>Confirmation template...</div>' },
        { id: 4, name: 'Welcome Email', subject: 'Welcome to Walla Walla Travel!', category: 'welcome', preview_html: '<div>Welcome template...</div>' },
        { id: 5, name: 'Follow-up', subject: 'How was your wine tour experience?', category: 'drip', preview_html: '<div>Follow-up template...</div>' },
        { id: 6, name: 'Cart Abandonment', subject: 'Your wine tour is waiting! 🍇', category: 'drip', preview_html: '<div>Abandonment template...</div>' },
      ])

      setLoading(false)
    }, 500)
  }, [])

  const getStatusBadge = (status: EmailCampaign['status']) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      sending: 'bg-yellow-100 text-yellow-700 animate-pulse',
      sent: 'bg-green-100 text-green-700',
      paused: 'bg-orange-100 text-orange-700',
    }
    return styles[status] || styles.draft
  }

  const getCampaignTypeIcon = (type: EmailCampaign['campaign_type']) => {
    const icons: Record<string, string> = {
      promotional: '🎁',
      newsletter: '📰',
      transactional: '📋',
      drip: '💧',
      welcome: '👋',
    }
    return icons[type] || '📧'
  }

  const calculateOpenRate = (campaign: EmailCampaign) => {
    if (campaign.recipients_count === 0) return 0
    return ((campaign.opened_count / campaign.recipients_count) * 100).toFixed(1)
  }

  const calculateClickRate = (campaign: EmailCampaign) => {
    if (campaign.opened_count === 0) return 0
    return ((campaign.clicked_count / campaign.opened_count) * 100).toFixed(1)
  }

  // Calculate aggregate stats
  const totalSent = campaigns.filter(c => c.status === 'sent').reduce((sum, c) => sum + c.recipients_count, 0)
  const totalOpened = campaigns.reduce((sum, c) => sum + c.opened_count, 0)
  const totalClicked = campaigns.reduce((sum, c) => sum + c.clicked_count, 0)
  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
              <span>/</span>
              <span>Email Campaigns</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">📧 Email Campaigns</h1>
            <p className="text-gray-600 mt-1">Create and manage email marketing campaigns</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span> New Campaign
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Sent</p>
            <p className="text-2xl font-bold text-gray-900">{totalSent.toLocaleString()}</p>
            <p className="text-xs text-green-600">All time</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Avg Open Rate</p>
            <p className="text-2xl font-bold text-blue-600">{avgOpenRate}%</p>
            <p className="text-xs text-gray-500">Industry avg: 21%</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Clicks</p>
            <p className="text-2xl font-bold text-purple-600">{totalClicked.toLocaleString()}</p>
            <p className="text-xs text-gray-500">From opened emails</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500">Subscribers</p>
            <p className="text-2xl font-bold text-green-600">3,150</p>
            <p className="text-xs text-green-600">+45 this week</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('campaigns')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'campaigns' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📧 Campaigns
          </button>
          <button
            onClick={() => setView('templates')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'templates' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📝 Templates
          </button>
        </div>

        {/* Campaigns View */}
        {view === 'campaigns' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Campaign List */}
            <div className="lg:col-span-2 space-y-4">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))
              ) : campaigns.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <div className="text-4xl mb-4">📧</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Create First Campaign
                  </button>
                </div>
              ) : (
                campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    onClick={() => setSelectedCampaign(campaign)}
                    className={`bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      selectedCampaign?.id === campaign.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getCampaignTypeIcon(campaign.campaign_type)}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                            <p className="text-sm text-gray-500">{campaign.subject}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>

                      {campaign.status === 'sent' && (
                        <div className="grid grid-cols-4 gap-4 text-center bg-gray-50 rounded-lg p-3">
                          <div>
                            <p className="text-lg font-bold text-gray-900">{campaign.recipients_count.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Sent</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-blue-600">{calculateOpenRate(campaign)}%</p>
                            <p className="text-xs text-gray-500">Opened</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-purple-600">{calculateClickRate(campaign)}%</p>
                            <p className="text-xs text-gray-500">Clicked</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold text-red-600">{campaign.unsubscribed_count}</p>
                            <p className="text-xs text-gray-500">Unsub</p>
                          </div>
                        </div>
                      )}

                      {campaign.status === 'scheduled' && campaign.scheduled_for && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg p-3">
                          <span>📅</span>
                          <span>Scheduled for {format(new Date(campaign.scheduled_for), 'MMM d, yyyy \'at\' h:mm a')}</span>
                        </div>
                      )}

                      {campaign.status === 'draft' && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                          <span>✏️</span>
                          <span>Draft - {campaign.recipients_count > 0 ? `${campaign.recipients_count} recipients selected` : 'No recipients selected'}</span>
                        </div>
                      )}
                    </div>

                    <div className="px-5 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                      <span>Created {format(new Date(campaign.created_at), 'MMM d, yyyy')}</span>
                      <div className="flex gap-2">
                        {campaign.status === 'draft' && (
                          <>
                            <button className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Edit</button>
                            <button className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Schedule</button>
                          </>
                        )}
                        {campaign.status === 'scheduled' && (
                          <button className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">Pause</button>
                        )}
                        {campaign.status === 'sent' && (
                          <button className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Duplicate</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Campaign Detail Panel */}
            <div className="lg:col-span-1">
              {selectedCampaign ? (
                <div className="bg-white rounded-xl shadow-sm sticky top-4">
                  <div className="p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">{selectedCampaign.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{selectedCampaign.subject}</p>
                  </div>

                  <div className="p-5 space-y-4">
                    {selectedCampaign.status === 'sent' && (
                      <>
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Performance</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Open Rate</span>
                              <span className="font-medium text-gray-900">{calculateOpenRate(selectedCampaign)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${calculateOpenRate(selectedCampaign)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                              <span className="text-sm text-gray-600">Click Rate</span>
                              <span className="font-medium text-gray-900">{calculateClickRate(selectedCampaign)}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${calculateClickRate(selectedCampaign)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Breakdown</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="font-bold text-gray-900">{selectedCampaign.opened_count}</p>
                              <p className="text-xs text-gray-500">Opened</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="font-bold text-gray-900">{selectedCampaign.clicked_count}</p>
                              <p className="text-xs text-gray-500">Clicked</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="font-bold text-red-600">{selectedCampaign.bounced_count}</p>
                              <p className="text-xs text-gray-500">Bounced</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="font-bold text-orange-600">{selectedCampaign.unsubscribed_count}</p>
                              <p className="text-xs text-gray-500">Unsubscribed</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Actions</h4>
                      <div className="space-y-2">
                        <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                          📋 View Full Report
                        </button>
                        <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                          🔄 Duplicate Campaign
                        </button>
                        <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                          📤 Export Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center sticky top-4">
                  <div className="text-4xl mb-4">👆</div>
                  <p className="text-gray-500">Select a campaign to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Templates View */}
        {view === 'templates' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-32 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <span className="text-4xl">📧</span>
                </div>
                <div className="p-5">
                  <span className="text-xs font-medium text-blue-600 uppercase">{template.category}</span>
                  <h3 className="font-semibold text-gray-900 mt-1">{template.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{template.subject}</p>
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                      Use Template
                    </button>
                    <button className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add Template Card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer">
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">+</span>
                </div>
                <h3 className="font-semibold text-gray-900">Create Template</h3>
                <p className="text-sm text-gray-500 mt-1">Design a new email template</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Create New Campaign</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Holiday Special Promotion" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="promotional">🎁 Promotional</option>
                  <option value="newsletter">📰 Newsletter</option>
                  <option value="welcome">👋 Welcome Series</option>
                  <option value="drip">💧 Drip Campaign</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Your email subject..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preview Text</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Text shown in inbox preview..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Select a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

