'use client';

import React, { useState } from 'react';
import PhoneInput from '@/components/ui/PhoneInput';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { ProposalDetail, ToastFn } from '@/lib/types/proposal-detail';

interface GuestsTabProps {
  proposal: ProposalDetail;
  addGuest: (data: { name: string; email: string; phone: string; is_primary: boolean }) => Promise<boolean>;
  updateGuestField: (guestId: number, field: string, value: string) => Promise<void>;
  updateGuestSettings: (settings: Record<string, unknown>) => Promise<void>;
  approveGuest: (guestId: number) => Promise<void>;
  rejectGuest: (guestId: number) => Promise<void>;
  deleteGuest: (guestId: number) => Promise<void>;
  saving: boolean;
  toast: ToastFn;
}

export const GuestsTab = React.memo(function GuestsTab({
  proposal,
  addGuest,
  updateGuestField,
  updateGuestSettings,
  approveGuest,
  rejectGuest,
  deleteGuest,
  saving,
  toast,
}: GuestsTabProps) {
  // Modal state (local to this component)
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [newGuestData, setNewGuestData] = useState({ name: '', email: '', phone: '', is_primary: false });
  const [editingGuestField, setEditingGuestField] = useState<{ guestId: number; field: string } | null>(null);
  const [editingGuestValue, setEditingGuestValue] = useState('');

  const handleAddGuest = async () => {
    const success = await addGuest(newGuestData);
    if (success) {
      setShowAddGuestModal(false);
      setNewGuestData({ name: '', email: '', phone: '', is_primary: false });
    }
  };

  const handleUpdateGuestField = async (guestId: number, field: string, value: string) => {
    await updateGuestField(guestId, field, value);
    setEditingGuestField(null);
  };

  const handleDeleteGuest = (guestId: number) => {
    if (!confirm('Remove this guest?')) return;
    deleteGuest(guestId);
  };

  const handleRejectGuest = (guestId: number) => {
    if (!confirm('Reject this guest registration?')) return;
    rejectGuest(guestId);
  };

  return (
    <div className="space-y-6">
      {/* Add Guest Modal */}
      {showAddGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setShowAddGuestModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-[calc(100vw-2rem)] sm:max-w-md w-full mx-4 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Guest</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  type="text"
                  value={newGuestData.name}
                  onChange={(e) => setNewGuestData({ ...newGuestData, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGuest()}
                  placeholder="Full name"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Email</label>
                <input
                  type="email"
                  value={newGuestData.email}
                  onChange={(e) => setNewGuestData({ ...newGuestData, email: e.target.value })}
                  placeholder="guest@example.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Phone</label>
                <PhoneInput
                  value={newGuestData.phone}
                  onChange={(value) => setNewGuestData({ ...newGuestData, phone: value })}
                  placeholder="(555) 000-0000"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newGuestData.is_primary}
                  onChange={(e) => setNewGuestData({ ...newGuestData, is_primary: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm text-gray-700">Primary contact</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAddGuestModal(false); setNewGuestData({ name: '', email: '', phone: '', is_primary: false }); }}
                disabled={saving}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGuest}
                disabled={saving || !newGuestData.name.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
              >
                {saving ? 'Adding...' : 'Add Guest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Settings Card */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Guest Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Max Guests (capacity)</label>
            <input
              type="number"
              min="1"
              value={proposal.max_guests ?? ''}
              onChange={(e) => updateGuestSettings({ max_guests: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="No limit"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Min Guests (threshold)</label>
            <input
              type="number"
              min="1"
              value={proposal.min_guests ?? ''}
              onChange={(e) => updateGuestSettings({ min_guests: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="None"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Min Guests Deadline</label>
            <input
              type="date"
              value={proposal.min_guests_deadline ?? ''}
              onChange={(e) => updateGuestSettings({ min_guests_deadline: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Min guests progress bar */}
        {proposal.min_guests && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
              <span className="font-semibold">
                {proposal.guests?.length || 0} of {proposal.min_guests} minimum guests
                {proposal.min_guests_deadline && (
                  <span className="text-gray-500 ml-1">(deadline: {formatDate(proposal.min_guests_deadline)})</span>
                )}
              </span>
              <span className={`font-bold ${(proposal.guests?.length || 0) >= proposal.min_guests ? 'text-emerald-600' : 'text-amber-600'}`}>
                {(proposal.guests?.length || 0) >= proposal.min_guests ? 'Met' : 'Not met'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${(proposal.guests?.length || 0) >= proposal.min_guests ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, ((proposal.guests?.length || 0) / proposal.min_guests) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Toggles */}
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-gray-900">Dynamic Pricing</span>
              <p className="text-xs text-gray-600">Per-person cost decreases as more guests join</p>
            </div>
            <input
              type="checkbox"
              checked={proposal.dynamic_pricing_enabled || false}
              onChange={() => updateGuestSettings({ dynamic_pricing_enabled: !proposal.dynamic_pricing_enabled })}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-gray-900">Show Guest Count to Guests</span>
              <p className="text-xs text-gray-600">Display headcount on join page and guest views</p>
            </div>
            <input
              type="checkbox"
              checked={proposal.show_guest_count_to_guests || false}
              onChange={() => updateGuestSettings({ show_guest_count_to_guests: !proposal.show_guest_count_to_guests })}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600"
            />
          </label>
        </div>

        {/* Dynamic Pricing Preview Table */}
        {proposal.dynamic_pricing_enabled && proposal.min_guests && proposal.max_guests && parseFloat(proposal.total) > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 mb-2">Pricing Preview</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-gray-700 font-semibold">Guests</th>
                    <th className="text-right py-1.5 px-2 text-gray-700 font-semibold">Est. Per Person</th>
                    <th className="text-right py-1.5 px-2 text-gray-700 font-semibold">Deposit ({proposal.deposit_percentage}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const total = parseFloat(proposal.total);
                    const min = proposal.min_guests!;
                    const max = proposal.max_guests!;
                    const steps = [min];
                    const step = Math.max(1, Math.floor((max - min) / 3));
                    for (let i = min + step; i < max; i += step) steps.push(i);
                    if (steps[steps.length - 1] !== max) steps.push(max);
                    return steps.map((count) => (
                      <tr key={count} className="border-b border-gray-100">
                        <td className="py-1.5 px-2 text-gray-900">
                          {count} {count === min ? '(min)' : count === max ? '(max)' : ''}
                        </td>
                        <td className="py-1.5 px-2 text-right text-gray-700">{formatCurrency(total / count)}</td>
                        <td className="py-1.5 px-2 text-right text-gray-700">
                          {count === min ? formatCurrency((total / count) * (proposal.deposit_percentage / 100)) : '—'}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Guest Invite Link */}
      <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-2">Guest Invite Link</h3>
        <p className="text-xs text-gray-600 mb-3">Share this link to let guests register themselves</p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/my-trip/${proposal.access_token}/join`}
            className="flex-1 text-xs px-3 py-2 bg-white border border-indigo-200 rounded-lg text-gray-700 truncate"
          />
          <button
            onClick={() => {
              const url = `${window.location.origin}/my-trip/${proposal.access_token}/join`;
              navigator.clipboard.writeText(url);
              toast('Invite link copied!', 'info');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
          >
            Copy Link
          </button>
        </div>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm font-medium text-gray-900">Require Approval</span>
            <p className="text-xs text-gray-600">New registrations need admin approval before being confirmed</p>
          </div>
          <input
            type="checkbox"
            checked={proposal.guest_approval_required || false}
            onChange={() => updateGuestSettings({ guest_approval_required: !proposal.guest_approval_required })}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
          />
        </label>
        {/* Status line */}
        <div className="mt-3 text-xs text-gray-700">
          <span className="font-semibold">{proposal.guests?.length || 0}</span> guest{(proposal.guests?.length || 0) !== 1 ? 's' : ''} registered
          {proposal.max_guests && (
            <span> of <span className="font-semibold">{proposal.max_guests}</span> spots</span>
          )}
          {proposal.guest_approval_required && (() => {
            const pending = (proposal.guests || []).filter(g => g.rsvp_status === 'pending' && g.is_registered).length;
            return pending > 0 ? (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium">
                {pending} pending approval
              </span>
            ) : null;
          })()}
        </div>
      </div>

      {/* Guest List */}
      {proposal.guests?.map((guest) => (
        <div key={guest.id} className={`border-2 rounded-lg p-4 ${
          guest.rsvp_status === 'pending' && guest.is_registered
            ? 'border-amber-300 bg-amber-50'
            : 'border-gray-200'
        }`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl shrink-0">
                {guest.rsvp_status === 'pending' && guest.is_registered ? '⏳' : '👤'}
              </span>
              <div className="min-w-0 flex-1">
                {/* Inline-editable name */}
                {editingGuestField?.guestId === guest.id && editingGuestField.field === 'name' ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingGuestValue}
                    onChange={(e) => setEditingGuestValue(e.target.value)}
                    onBlur={() => handleUpdateGuestField(guest.id, 'name', editingGuestValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateGuestField(guest.id, 'name', editingGuestValue);
                      if (e.key === 'Escape') setEditingGuestField(null);
                    }}
                    className="font-bold text-gray-900 border border-indigo-300 rounded px-2 py-0.5 text-sm w-full focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <span
                    className="font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => { setEditingGuestField({ guestId: guest.id, field: 'name' }); setEditingGuestValue(guest.name); }}
                    title="Click to edit"
                  >
                    {guest.name}
                  </span>
                )}
                {guest.is_primary && (
                  <span className="ml-2 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded font-medium">
                    Primary
                  </span>
                )}
                {guest.rsvp_status === 'pending' && guest.is_registered && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded font-medium">
                    Pending Approval
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {guest.rsvp_status === 'pending' && guest.is_registered && (
                <>
                  <button onClick={() => approveGuest(guest.id)} className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-xs font-medium">Approve</button>
                  <button onClick={() => handleRejectGuest(guest.id)} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium">Reject</button>
                </>
              )}
              <button
                onClick={() => handleDeleteGuest(guest.id)}
                className="text-red-600 hover:text-red-800 font-bold text-sm"
              >
                Remove
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {/* Inline-editable email */}
            <div>
              <span className="text-gray-500 text-xs">Email: </span>
              {editingGuestField?.guestId === guest.id && editingGuestField.field === 'email' ? (
                <input
                  autoFocus
                  type="email"
                  value={editingGuestValue}
                  onChange={(e) => setEditingGuestValue(e.target.value)}
                  onBlur={() => handleUpdateGuestField(guest.id, 'email', editingGuestValue)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateGuestField(guest.id, 'email', editingGuestValue);
                    if (e.key === 'Escape') setEditingGuestField(null);
                  }}
                  className="border border-indigo-300 rounded px-2 py-0.5 text-sm w-full focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <span
                  className={`cursor-pointer hover:text-indigo-600 transition-colors ${guest.email ? 'text-gray-900' : 'text-gray-400 italic'}`}
                  onClick={() => { setEditingGuestField({ guestId: guest.id, field: 'email' }); setEditingGuestValue(guest.email || ''); }}
                  title="Click to edit"
                >
                  {guest.email || 'No email'}
                </span>
              )}
            </div>
            {/* Inline-editable phone */}
            <div>
              <span className="text-gray-500 text-xs">Phone: </span>
              {editingGuestField?.guestId === guest.id && editingGuestField.field === 'phone' ? (
                <input
                  autoFocus
                  type="tel"
                  value={editingGuestValue}
                  onChange={(e) => setEditingGuestValue(e.target.value)}
                  onBlur={() => handleUpdateGuestField(guest.id, 'phone', editingGuestValue)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateGuestField(guest.id, 'phone', editingGuestValue);
                    if (e.key === 'Escape') setEditingGuestField(null);
                  }}
                  className="border border-indigo-300 rounded px-2 py-0.5 text-sm w-full focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <span
                  className={`cursor-pointer hover:text-indigo-600 transition-colors ${guest.phone ? 'text-gray-900' : 'text-gray-400 italic'}`}
                  onClick={() => { setEditingGuestField({ guestId: guest.id, field: 'phone' }); setEditingGuestValue(guest.phone || ''); }}
                  title="Click to edit"
                >
                  {guest.phone || 'No phone'}
                </span>
              )}
            </div>
            {guest.dietary_restrictions && (
              <div className="col-span-2">
                <span className="text-gray-500 text-xs">Dietary:</span>{' '}
                <span className="text-gray-900">{guest.dietary_restrictions}</span>
              </div>
            )}
          </div>

          {/* Per-guest link */}
          {guest.guest_access_token && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/my-trip/${proposal.access_token}?guest=${guest.guest_access_token}`}
                  className="flex-1 text-xs px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-gray-600 truncate"
                />
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/my-trip/${proposal.access_token}?guest=${guest.guest_access_token}`;
                    navigator.clipboard.writeText(url);
                    toast('Guest link copied!', 'info');
                  }}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-medium shrink-0 transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Guest Button */}
      <button
        onClick={() => setShowAddGuestModal(true)}
        disabled={saving || (proposal.max_guests != null && (proposal.guests?.length || 0) >= proposal.max_guests)}
        title={proposal.max_guests != null && (proposal.guests?.length || 0) >= proposal.max_guests ? `At maximum capacity (${proposal.max_guests} guests)` : undefined}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-indigo-400 text-gray-600 hover:text-indigo-600 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {proposal.max_guests != null && (proposal.guests?.length || 0) >= proposal.max_guests
          ? `At Capacity (${proposal.max_guests} guests)`
          : '+ Add Guest'}
      </button>
    </div>
  );
});
