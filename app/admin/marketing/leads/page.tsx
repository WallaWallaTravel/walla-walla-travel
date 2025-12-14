'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Lead {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company: string | null
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiating' | 'won' | 'lost' | 'nurturing'
  temperature: 'hot' | 'warm' | 'cold'
  score: number
  interested_services: string[]
  party_size_estimate: number | null
  estimated_date: string | null
  budget_range: string | null
  next_followup_at: string | null
  last_contact_at: string | null
  notes: string | null
  created_at: string
}

export default function LeadManagement() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'qualified' | 'hot'>('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    // Simulated data
    setTimeout(() => {
      setLeads([
        {
          id: 1,
          first_name: 'Sarah',
          last_name: 'Johnson',
          email: 'sarah@techcorp.com',
          phone: '(206) 555-0123',
          company: 'TechCorp Inc.',
          source: 'website',
          status: 'new',
          temperature: 'hot',
          score: 85,
          interested_services: ['Corporate Wine Tour', 'Team Building'],
          party_size_estimate: 20,
          estimated_date: '2025-02-15',
          budget_range: '$3,000 - $5,000',
          next_followup_at: '2025-11-30T10:00:00',
          last_contact_at: null,
          notes: 'Looking for a corporate team building event. Very interested in premium wineries.',
          created_at: '2025-11-28T14:30:00',
        },
        {
          id: 2,
          first_name: 'Michael',
          last_name: 'Chen',
          email: 'mchen@gmail.com',
          phone: '(503) 555-0456',
          company: null,
          source: 'referral',
          status: 'qualified',
          temperature: 'warm',
          score: 72,
          interested_services: ['Private Wine Tour'],
          party_size_estimate: 6,
          estimated_date: '2025-01-20',
          budget_range: '$1,000 - $2,000',
          next_followup_at: '2025-12-02T14:00:00',
          last_contact_at: '2025-11-25T11:00:00',
          notes: 'Anniversary celebration. Referred by Johnson wedding party.',
          created_at: '2025-11-22T09:15:00',
        },
        {
          id: 3,
          first_name: 'Emily',
          last_name: 'Rodriguez',
          email: 'emily.r@weddingplans.com',
          phone: '(509) 555-0789',
          company: 'Wedding Plans Co.',
          source: 'social_media',
          status: 'proposal_sent',
          temperature: 'hot',
          score: 92,
          interested_services: ['Wedding Wine Tour', 'Rehearsal Dinner Transport'],
          party_size_estimate: 35,
          estimated_date: '2025-06-14',
          budget_range: '$5,000+',
          next_followup_at: '2025-12-01T09:00:00',
          last_contact_at: '2025-11-27T16:30:00',
          notes: 'Wedding in June. Very excited about the proposal. Following up on questions about vehicle options.',
          created_at: '2025-11-15T10:45:00',
        },
        {
          id: 4,
          first_name: 'David',
          last_name: 'Thompson',
          email: 'dthompson@startup.io',
          phone: null,
          company: 'Startup.io',
          source: 'email_campaign',
          status: 'contacted',
          temperature: 'cold',
          score: 45,
          interested_services: ['Wine Tour'],
          party_size_estimate: 12,
          estimated_date: null,
          budget_range: null,
          next_followup_at: '2025-12-05T11:00:00',
          last_contact_at: '2025-11-20T13:00:00',
          notes: 'Responded to email but hasn\'t scheduled call yet.',
          created_at: '2025-11-18T08:30:00',
        },
        {
          id: 5,
          first_name: 'Lisa',
          last_name: 'Park',
          email: 'lisa.park@lawfirm.com',
          phone: '(206) 555-0321',
          company: 'Park & Associates Law',
          source: 'partner',
          status: 'negotiating',
          temperature: 'hot',
          score: 88,
          interested_services: ['Corporate Event', 'VIP Wine Experience'],
          party_size_estimate: 50,
          estimated_date: '2025-03-22',
          budget_range: '$8,000 - $10,000',
          next_followup_at: '2025-11-29T15:00:00',
          last_contact_at: '2025-11-28T10:00:00',
          notes: 'Annual partner retreat. Negotiating on price for larger group.',
          created_at: '2025-11-10T11:20:00',
        },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const filteredLeads = leads.filter(lead => {
    if (filter === 'all') return true
    if (filter === 'new') return lead.status === 'new'
    if (filter === 'qualified') return ['qualified', 'proposal_sent', 'negotiating'].includes(lead.status)
    if (filter === 'hot') return lead.temperature === 'hot'
    return true
  })

  const getStatusColor = (status: Lead['status']) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-purple-100 text-purple-700',
      qualified: 'bg-green-100 text-green-700',
      proposal_sent: 'bg-yellow-100 text-yellow-700',
      negotiating: 'bg-orange-100 text-orange-700',
      won: 'bg-emerald-100 text-emerald-700',
      lost: 'bg-red-100 text-red-700',
      nurturing: 'bg-gray-100 text-gray-700',
    }
    return colors[status] || colors.new
  }

  const getTemperatureEmoji = (temp: Lead['temperature']) => {
    const emojis: Record<string, string> = { hot: '🔥', warm: '☀️', cold: '❄️' }
    return emojis[temp]
  }

  const getSourceEmoji = (source: string) => {
    const emojis: Record<string, string> = {
      website: '🌐',
      referral: '👥',
      social_media: '📱',
      email_campaign: '📧',
      paid_ads: '💰',
      event: '🎪',
      cold_outreach: '📞',
      partner: '🤝',
      other: '📋',
    }
    return emojis[source] || '📋'
  }

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/marketing" className="hover:text-purple-600">Marketing</Link>
              <span>/</span>
              <span>Leads</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">🎯 Lead Management</h1>
            <p className="text-gray-600 mt-1">Track and nurture your sales pipeline</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
          >
            <span>+</span> Add Lead
          </button>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost'].map((status) => (
            <div key={status} className="bg-white rounded-lg p-3 shadow-sm text-center">
              <p className="text-xs text-gray-500 uppercase mb-1">{status.replace('_', ' ')}</p>
              <p className="text-xl font-bold text-gray-900">
                {leads.filter(l => l.status === status).length}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'new', 'qualified', 'hot'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f === 'hot' ? '🔥 Hot Leads' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lead List */}
          <div className="lg:col-span-2 space-y-3">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))
            ) : filteredLeads.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
                <p className="text-gray-500">Try adjusting your filters</p>
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    selectedLead?.id === lead.id ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{getTemperatureEmoji(lead.temperature)}</span>
                      <h3 className="font-semibold text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </h3>
                      {lead.company && (
                        <span className="text-sm text-gray-500">@ {lead.company}</span>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                    <span>{getSourceEmoji(lead.source)} {lead.source.replace('_', ' ')}</span>
                    {lead.party_size_estimate && (
                      <span>👥 {lead.party_size_estimate} guests</span>
                    )}
                    {lead.budget_range && (
                      <span>💰 {lead.budget_range}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${lead.score}%` }}
                        ></div>
                      </div>
                      <span className="text-gray-500">Score: {lead.score}</span>
                    </div>
                    {lead.next_followup_at && (
                      <span className={`${isOverdue(lead.next_followup_at) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {isOverdue(lead.next_followup_at) ? '⚠️ Overdue' : `📅 ${format(new Date(lead.next_followup_at), 'MMM d, h:mm a')}`}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Lead Detail Panel */}
          <div className="lg:col-span-1">
            {selectedLead ? (
              <div className="bg-white rounded-xl shadow-sm sticky top-4">
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedLead.first_name} {selectedLead.last_name}
                    </h2>
                    <span>{getTemperatureEmoji(selectedLead.temperature)}</span>
                  </div>
                  {selectedLead.company && (
                    <p className="text-gray-600">{selectedLead.company}</p>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {/* Contact Info */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Contact</h4>
                    <p className="text-sm text-gray-900">{selectedLead.email}</p>
                    {selectedLead.phone && (
                      <p className="text-sm text-gray-900">{selectedLead.phone}</p>
                    )}
                  </div>

                  {/* Interests */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Interested In</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedLead.interested_services.map((service, i) => (
                        <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedLead.party_size_estimate && (
                      <div>
                        <p className="text-gray-500">Party Size</p>
                        <p className="font-medium">{selectedLead.party_size_estimate} guests</p>
                      </div>
                    )}
                    {selectedLead.estimated_date && (
                      <div>
                        <p className="text-gray-500">Target Date</p>
                        <p className="font-medium">{format(new Date(selectedLead.estimated_date), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                    {selectedLead.budget_range && (
                      <div>
                        <p className="text-gray-500">Budget</p>
                        <p className="font-medium">{selectedLead.budget_range}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500">Source</p>
                      <p className="font-medium">{getSourceEmoji(selectedLead.source)} {selectedLead.source.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedLead.notes && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Notes</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedLead.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-100 space-y-2">
                    <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                      📞 Log Call
                    </button>
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      📧 Send Email
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
                        📝 Add Note
                      </button>
                      <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                        📅 Schedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center sticky top-4">
                <div className="text-4xl mb-4">👆</div>
                <p className="text-gray-500">Select a lead to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Lead</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social_media">Social Media</option>
                  <option value="email_campaign">Email Campaign</option>
                  <option value="cold_outreach">Cold Outreach</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}




