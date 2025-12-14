'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Partner {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  business_name: string;
  business_type: string;
  status: 'pending' | 'active' | 'suspended';
  setup_completed_at: string | null;
  created_at: string;
}

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  suspended: 'bg-red-100 text-red-800',
};

const BUSINESS_TYPE_ICONS = {
  winery: '🍷',
  hotel: '🏨',
  restaurant: '🍽️',
  activity: '🎯',
  other: '📍',
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');

  useEffect(() => {
    async function fetchPartners() {
      try {
        const response = await fetch('/api/admin/partners');
        if (response.ok) {
          const data = await response.json();
          setPartners(data.partners);
        }
      } catch (error) {
        console.error('Failed to load partners:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPartners();
  }, []);

  const filteredPartners = partners.filter(p => 
    filter === 'all' || p.status === filter
  );

  const counts = {
    all: partners.length,
    pending: partners.filter(p => p.status === 'pending').length,
    active: partners.filter(p => p.status === 'active').length,
    suspended: partners.filter(p => p.status === 'suspended').length,
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partners</h1>
          <p className="text-slate-500 mt-1">
            Manage local business partners for the AI directory
          </p>
        </div>
        <Link
          href="/admin/partners/invite"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg font-medium hover:bg-[#2d4a6f] transition-colors"
        >
          <span>+</span>
          Invite Partner
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'active', 'suspended'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-2 opacity-75">({counts[status]})</span>
          </button>
        ))}
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Business
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPartners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  {filter === 'all' 
                    ? 'No partners yet. Invite your first partner to get started.'
                    : `No ${filter} partners.`
                  }
                </td>
              </tr>
            ) : (
              filteredPartners.map((partner) => (
                <tr key={partner.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{partner.business_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1">
                      <span>{BUSINESS_TYPE_ICONS[partner.business_type as keyof typeof BUSINESS_TYPE_ICONS] || '📍'}</span>
                      <span className="text-slate-600 capitalize">{partner.business_type}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{partner.user_name}</div>
                    <div className="text-sm text-slate-500">{partner.user_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[partner.status]}`}>
                      {partner.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(partner.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-sm text-[#1E3A5F] hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}




