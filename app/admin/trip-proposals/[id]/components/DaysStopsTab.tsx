'use client';

import React, { useState } from 'react';
import PhoneInput from '@/components/ui/PhoneInput';
import { formatDate } from '@/lib/utils/formatters';
import type { ProposalDetail, Winery, Restaurant, Hotel, StopData } from '@/lib/types/proposal-detail';
import SendRequestModal from '@/components/trip-proposals/SendRequestModal';
import RequestStatusBadge from '@/components/trip-proposals/RequestStatusBadge';
import VendorThread from '@/components/trip-proposals/VendorThread';

const STOP_TYPES = [
  { value: 'pickup', label: 'Pickup', icon: '🚗' },
  { value: 'dropoff', label: 'Dropoff', icon: '🏁' },
  { value: 'winery', label: 'Winery', icon: '🍷' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'activity', label: 'Activity', icon: '🎈' },
  { value: 'custom', label: 'Custom', icon: '📍' },
];

interface DaysStopsTabProps {
  proposal: ProposalDetail;
  wineries: Winery[];
  restaurants: Restaurant[];
  hotels: Hotel[];
  savedMenus: Array<{ id: number; name: string }>;
  addDay: () => Promise<void>;
  addStop: (dayId: number, stopType: string) => Promise<void>;
  updateStop: (dayId: number, stopId: number, updates: Record<string, unknown>) => Promise<void>;
  updateStopDebounced: (dayId: number, stopId: number, updates: Record<string, unknown>) => void;
  deleteStop: (dayId: number, stopId: number) => Promise<void>;
  updateVendorField: (stopId: number, field: string, value: string | number | null) => Promise<void>;
  logVendorInteraction: (stopId: number, note: string) => Promise<void>;
  setProposal: (fn: ProposalDetail | null | ((prev: ProposalDetail | null) => ProposalDetail | null)) => void;
  refetchProposal: () => Promise<void>;
  saving: boolean;
}

export const DaysStopsTab = React.memo(function DaysStopsTab({
  proposal,
  wineries,
  restaurants,
  hotels,
  savedMenus,
  addDay,
  addStop,
  updateStop,
  updateStopDebounced,
  deleteStop,
  updateVendorField,
  logVendorInteraction,
  setProposal,
  refetchProposal,
  saving,
}: DaysStopsTabProps) {
  // Vendor interaction log: which stop has the log input open
  const [vendorLogStopId, setVendorLogStopId] = useState<number | null>(null);
  const [vendorLogText, setVendorLogText] = useState('');
  // Send Request modal state
  const [requestModalStop, setRequestModalStop] = useState<{ stop: StopData; dayDate: string } | null>(null);

  const handleDeleteStop = (dayId: number, stopId: number) => {
    if (!confirm('Delete this stop?')) return;
    deleteStop(dayId, stopId);
  };

  const handleLogVendorInteraction = async (stopId: number) => {
    if (!vendorLogText.trim()) return;
    await logVendorInteraction(stopId, vendorLogText.trim());
    setVendorLogStopId(null);
    setVendorLogText('');
  };

  return (
    <div className="space-y-6">
      {proposal.days?.map((day) => (
        <div key={day.id} className="border-2 border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-brand-light p-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900">{day.title}</div>
              <div className="text-sm text-gray-600">{formatDate(day.date)}</div>
            </div>
            <span className="text-sm text-gray-600">
              {day.stops.length} stop{day.stops.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-4 space-y-3">
            {day.stops.map((stop) => {
              const stopType = STOP_TYPES.find((t) => t.value === stop.stop_type);
              const venueName = stop.winery?.name || stop.restaurant?.name || stop.hotel?.name || stop.custom_name || 'Unknown';

              return (
                <div key={stop.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{stopType?.icon || '📍'}</span>
                      <div>
                        <div className="font-bold text-sm">{venueName}</div>
                        <div className="text-xs text-gray-500">
                          {stop.scheduled_time} • {stop.duration_minutes || 0} min
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStop(day.id, stop.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {stop.stop_type === 'winery' && (
                      <div className="col-span-2">
                        <select
                          value={stop.winery_id || ''}
                          onChange={(e) =>
                            updateStop(day.id, stop.id, {
                              winery_id: parseInt(e.target.value) || null,
                            })
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select winery...</option>
                          {wineries.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {stop.stop_type === 'restaurant' && (
                      <div className="col-span-2">
                        <select
                          value={stop.restaurant_id || ''}
                          onChange={(e) =>
                            updateStop(day.id, stop.id, {
                              restaurant_id: parseInt(e.target.value) || null,
                            })
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select restaurant...</option>
                          {restaurants.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {stop.stop_type === 'hotel' && (
                      <div className="col-span-2">
                        <select
                          value={stop.hotel_id || ''}
                          onChange={(e) =>
                            updateStop(day.id, stop.id, {
                              hotel_id: parseInt(e.target.value) || null,
                            })
                          }
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option value="">Select hotel...</option>
                          {hotels.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <input
                      type="time"
                      value={stop.scheduled_time || ''}
                      onChange={(e) =>
                        updateStop(day.id, stop.id, { scheduled_time: e.target.value })
                      }
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />

                    <input
                      type="number"
                      min="0"
                      value={stop.duration_minutes || ''}
                      onChange={(e) =>
                        updateStop(day.id, stop.id, { duration_minutes: parseInt(e.target.value) || null })
                      }
                      placeholder="Min"
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>

                  {/* Saved Menu Selector */}
                  {['restaurant', 'winery'].includes(stop.stop_type) && savedMenus.length > 0 && (
                    <div className="mt-2">
                      <select
                        value={stop.saved_menu_id || ''}
                        onChange={(e) =>
                          updateStop(day.id, stop.id, { saved_menu_id: parseInt(e.target.value) || null })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Lunch menu (optional)...</option>
                        {savedMenus.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cost Note (informational) */}
                  <div className="mt-2">
                    <input
                      type="text"
                      value={stop.cost_note || ''}
                      onChange={(e) =>
                        updateStopDebounced(day.id, stop.id, { cost_note: e.target.value })
                      }
                      placeholder="e.g., Tasting fee ~$25/pp, paid at winery"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-600 italic"
                    />
                  </div>

                  {/* Vendor Tracking (collapsible) */}
                  <details className="mt-2 border-t border-gray-200 pt-2">
                    <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-gray-900 flex items-center gap-1">
                      Vendor
                      <RequestStatusBadge status={stop.reservation_status || 'pending'} />
                      {stop.quote_status && stop.quote_status !== 'none' && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                          stop.quote_status === 'paid' ? 'bg-green-100 text-green-800' :
                          stop.quote_status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          stop.quote_status === 'accepted' ? 'bg-indigo-100 text-indigo-800' :
                          stop.quote_status === 'quoted' ? 'bg-yellow-100 text-yellow-800' :
                          stop.quote_status === 'requested' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>{stop.quote_status}</span>
                      )}
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={stop.vendor_name || ''}
                          onBlur={(e) => updateVendorField(stop.id, 'vendor_name', e.target.value)}
                          onChange={(e) => {
                            const newStops = day.stops.map(s => s.id === stop.id ? { ...s, vendor_name: e.target.value } : s);
                            const newDays = (proposal.days || []).map(d => d.id === day.id ? { ...d, stops: newStops } : d);
                            setProposal((prev: ProposalDetail | null) => prev ? { ...prev, days: newDays } : prev);
                          }}
                          placeholder="Contact name"
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                        <div className="flex gap-1">
                          <input
                            type="email"
                            value={stop.vendor_email || ''}
                            onBlur={(e) => updateVendorField(stop.id, 'vendor_email', e.target.value)}
                            onChange={(e) => {
                              const newStops = day.stops.map(s => s.id === stop.id ? { ...s, vendor_email: e.target.value } : s);
                              const newDays = (proposal.days || []).map(d => d.id === day.id ? { ...d, stops: newStops } : d);
                              setProposal((prev: ProposalDetail | null) => prev ? { ...prev, days: newDays } : prev);
                            }}
                            placeholder="Email"
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                          {stop.vendor_email && (
                            <a
                              href={`mailto:${stop.vendor_email}`}
                              className="px-1.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
                              title="Send email"
                            >
                              @
                            </a>
                          )}
                        </div>
                        <PhoneInput
                          value={stop.vendor_phone || ''}
                          onChange={(value) => {
                            const newStops = day.stops.map(s => s.id === stop.id ? { ...s, vendor_phone: value } : s);
                            const newDays = (proposal.days || []).map(d => d.id === day.id ? { ...d, stops: newStops } : d);
                            setProposal((prev: ProposalDetail | null) => prev ? { ...prev, days: newDays } : prev);
                          }}
                          placeholder="Phone"
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          value={stop.quote_status || 'none'}
                          onChange={(e) => {
                            updateVendorField(stop.id, 'quote_status', e.target.value).then(() => refetchProposal());
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="none">No Quote</option>
                          <option value="requested">Requested</option>
                          <option value="quoted">Quoted</option>
                          <option value="accepted">Accepted</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="paid">Paid</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={stop.quoted_amount ?? ''}
                          onBlur={(e) => {
                            updateVendorField(stop.id, 'quoted_amount', e.target.value ? parseFloat(e.target.value) : null);
                          }}
                          onChange={(e) => {
                            const newStops = day.stops.map(s => s.id === stop.id ? { ...s, quoted_amount: e.target.value ? parseFloat(e.target.value) : undefined } : s);
                            const newDays = (proposal.days || []).map(d => d.id === day.id ? { ...d, stops: newStops } : d);
                            setProposal((prev: ProposalDetail | null) => prev ? { ...prev, days: newDays } : prev);
                          }}
                          placeholder="Quoted $"
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                        {vendorLogStopId === stop.id ? (
                          <div className="flex gap-1">
                            <input
                              autoFocus
                              type="text"
                              value={vendorLogText}
                              onChange={(e) => setVendorLogText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleLogVendorInteraction(stop.id);
                                if (e.key === 'Escape') { setVendorLogStopId(null); setVendorLogText(''); }
                              }}
                              placeholder="Interaction note..."
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <button
                              onClick={() => handleLogVendorInteraction(stop.id)}
                              disabled={!vendorLogText.trim()}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium disabled:opacity-50"
                            >
                              Log
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setVendorLogStopId(stop.id); setVendorLogText(''); }}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium"
                            >
                              + Log
                            </button>
                            <button
                              onClick={() => setRequestModalStop({ stop, dayDate: day.date })}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-medium"
                            >
                              Send Request
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Conversation Thread */}
                      <VendorThread proposalId={proposal.id} stopId={stop.id} />
                    </div>
                  </details>
                </div>
              );
            })}

            {/* Add Stop Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
              {STOP_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => addStop(day.id, type.value)}
                  disabled={saving}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addDay}
        disabled={saving}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-brand text-gray-600 hover:text-brand rounded-lg font-bold transition-colors disabled:opacity-50"
      >
        + Add Another Day
      </button>

      {/* Send Request Modal */}
      {requestModalStop && (
        <SendRequestModal
          proposalId={proposal.id}
          stopId={requestModalStop.stop.id}
          venueName={requestModalStop.stop.winery?.name || requestModalStop.stop.restaurant?.name || requestModalStop.stop.hotel?.name || requestModalStop.stop.custom_name || 'Venue'}
          vendorEmail={requestModalStop.stop.vendor_email}
          vendorName={requestModalStop.stop.vendor_name}
          date={requestModalStop.dayDate}
          time={requestModalStop.stop.scheduled_time}
          partySize={proposal.party_size}
          onClose={() => setRequestModalStop(null)}
          onSent={() => {
            setRequestModalStop(null);
            refetchProposal();
          }}
        />
      )}
    </div>
  );
});
