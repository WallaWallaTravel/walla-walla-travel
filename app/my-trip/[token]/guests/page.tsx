'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProposal } from '@/lib/contexts/proposal-context';

interface GuestData {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  special_requests: string | null;
  rsvp_status: string;
}

export default function GuestsPage() {
  const { proposal, planningPhase, accessToken } = useProposal();
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<GuestData>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (proposal?.guests) {
      setGuests(proposal.guests as unknown as GuestData[]);
    }
  }, [proposal?.guests]);

  const isReadOnly = planningPhase === 'finalized' || planningPhase === 'proposal';

  const startEdit = useCallback((guest: GuestData) => {
    if (isReadOnly) return;
    setEditingId(guest.id);
    setEditForm({
      dietary_restrictions: guest.dietary_restrictions || '',
      accessibility_needs: guest.accessibility_needs || '',
      special_requests: guest.special_requests || '',
    });
  }, [isReadOnly]);

  const saveGuest = async () => {
    if (!editingId || isReadOnly) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/my-trip/${accessToken}/guests/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const result = await response.json();
      if (result.success) {
        setGuests((prev) =>
          prev.map((g) => (g.id === editingId ? { ...g, ...editForm } : g))
        );
        setEditingId(null);
        setEditForm({});
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  if (planningPhase === 'proposal') {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">👥</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Guest Management</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Guest details and dietary information will be available once the trip is confirmed
          and moves to active planning.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Guest List</h2>
          <p className="text-sm text-gray-600 mt-1">
            {guests.length} guest{guests.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        {planningPhase === 'finalized' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            Read-only
          </span>
        )}
      </div>

      {guests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-700 font-medium">No guests added yet</p>
          <p className="text-gray-600 text-sm mt-1">
            Guests will appear here once your trip coordinator adds them.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {guests.map((guest) => (
            <div
              key={guest.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                    {guest.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {guest.name}
                      {guest.is_primary && (
                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          Primary
                        </span>
                      )}
                    </h3>
                    {guest.email && (
                      <p className="text-sm text-gray-600">{guest.email}</p>
                    )}
                  </div>
                </div>

                {!isReadOnly && editingId !== guest.id && (
                  <button
                    onClick={() => startEdit(guest)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Edit details
                  </button>
                )}
              </div>

              {editingId === guest.id ? (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Dietary Restrictions
                    </label>
                    <input
                      type="text"
                      value={editForm.dietary_restrictions || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, dietary_restrictions: e.target.value })
                      }
                      placeholder="e.g., Vegetarian, Gluten-free, Nut allergy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Accessibility Needs
                    </label>
                    <input
                      type="text"
                      value={editForm.accessibility_needs || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, accessibility_needs: e.target.value })
                      }
                      placeholder="e.g., Wheelchair access, Limited mobility"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Special Requests
                    </label>
                    <textarea
                      value={editForm.special_requests || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, special_requests: e.target.value })
                      }
                      placeholder="Any other requests or notes..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveGuest}
                      disabled={saving}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {guest.dietary_restrictions && (
                    <div>
                      <span className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                        Dietary
                      </span>
                      <p className="text-gray-900 mt-0.5">{guest.dietary_restrictions}</p>
                    </div>
                  )}
                  {guest.accessibility_needs && (
                    <div>
                      <span className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                        Accessibility
                      </span>
                      <p className="text-gray-900 mt-0.5">{guest.accessibility_needs}</p>
                    </div>
                  )}
                  {guest.special_requests && (
                    <div>
                      <span className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                        Requests
                      </span>
                      <p className="text-gray-900 mt-0.5">{guest.special_requests}</p>
                    </div>
                  )}
                  {!guest.dietary_restrictions &&
                    !guest.accessibility_needs &&
                    !guest.special_requests && (
                      <p className="text-gray-500 text-sm col-span-3">
                        No dietary or accessibility information provided yet.
                        {!isReadOnly && ' Click "Edit details" to add.'}
                      </p>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
