'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripPlannerStore, useCurrentTrip, useTripLoading, useTripError } from '@/lib/stores/trip-planner';
import { TripStop, TripGuest, AddStopRequest, AddGuestRequest } from '@/lib/types/trip-planner';

// ============================================================================
// Tab Navigation
// ============================================================================

type TabType = 'itinerary' | 'guests' | 'share';

function TabNav({ activeTab, onTabChange }: { activeTab: TabType; onTabChange: (tab: TabType) => void }) {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'itinerary', label: 'Itinerary', icon: '📍' },
    { id: 'guests', label: 'Guests', icon: '👥' },
    { id: 'share', label: 'Share', icon: '🔗' },
  ];

  return (
    <div className="flex border-b border-stone-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'text-[#722F37] border-b-2 border-[#722F37]'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <span className="mr-1">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Itinerary Tab
// ============================================================================

function ItineraryTab({ 
  stops, 
  tripId,
  onAddStop 
}: { 
  stops: TripStop[]; 
  tripId: number;
  onAddStop: () => void;
}) {
  const removeStop = useTripPlannerStore((state) => state.removeStop);

  // Group stops by day
  const stopsByDay = stops.reduce((acc, stop) => {
    const day = stop.day_number;
    if (!acc[day]) acc[day] = [];
    acc[day].push(stop);
    return acc;
  }, {} as Record<number, TripStop[]>);

  const days = Object.keys(stopsByDay).map(Number).sort((a, b) => a - b);

  const stopTypeIcons: Record<string, string> = {
    winery: '🍷',
    restaurant: '🍽️',
    activity: '🎯',
    accommodation: '🏨',
    transportation: '🚐',
    custom: '📌',
  };

  if (stops.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-5xl mb-4">📍</div>
        <h3 className="text-lg font-semibold text-stone-900 mb-2">
          No stops yet
        </h3>
        <p className="text-stone-600 mb-6">
          Add wineries, restaurants, and activities to build your itinerary
        </p>
        <button
          onClick={onAddStop}
          className="px-5 py-2.5 bg-[#722F37] text-white font-medium rounded-xl hover:bg-[#8B1538] transition-colors"
        >
          + Add First Stop
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {days.map((day) => (
        <div key={day}>
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
            Day {day}
          </h3>
          <div className="space-y-3">
            {stopsByDay[day]
              .sort((a, b) => a.stop_order - b.stop_order)
              .map((stop) => (
                <div
                  key={stop.id}
                  className="bg-white rounded-xl border border-stone-200 p-4 flex items-start gap-3"
                >
                  <div className="text-2xl">{stopTypeIcons[stop.stop_type]}</div>
                  <div className="flex-1">
                    <div className="font-medium text-stone-900">{stop.name}</div>
                    {stop.planned_arrival && (
                      <div className="text-sm text-stone-500">
                        {stop.planned_arrival}
                        {stop.planned_departure && ` – ${stop.planned_departure}`}
                      </div>
                    )}
                    {stop.notes && (
                      <div className="text-sm text-stone-600 mt-1">{stop.notes}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeStop(tripId, stop.id)}
                    className="text-stone-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}

      <button
        onClick={onAddStop}
        className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-[#722F37] hover:text-[#722F37] transition-colors"
      >
        + Add Stop
      </button>
    </div>
  );
}

// ============================================================================
// Guests Tab
// ============================================================================

function GuestsTab({ 
  guests, 
  tripId,
  onAddGuest 
}: { 
  guests: TripGuest[]; 
  tripId: number;
  onAddGuest: () => void;
}) {
  const removeGuest = useTripPlannerStore((state) => state.removeGuest);

  const rsvpColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    invited: 'bg-blue-100 text-blue-600',
    attending: 'bg-green-100 text-green-600',
    declined: 'bg-red-100 text-red-600',
    maybe: 'bg-amber-100 text-amber-600',
  };

  if (guests.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-5xl mb-4">👥</div>
        <h3 className="text-lg font-semibold text-stone-900 mb-2">
          No guests yet
        </h3>
        <p className="text-stone-600 mb-6">
          Add your group members to track RSVPs and dietary needs
        </p>
        <button
          onClick={onAddGuest}
          className="px-5 py-2.5 bg-[#722F37] text-white font-medium rounded-xl hover:bg-[#8B1538] transition-colors"
        >
          + Add First Guest
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {guests.map((guest) => (
        <div
          key={guest.id}
          className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-lg">
            {guest.is_organizer ? '👑' : '👤'}
          </div>
          <div className="flex-1">
            <div className="font-medium text-stone-900">
              {guest.name}
              {guest.is_organizer && (
                <span className="ml-2 text-xs text-amber-600">(Organizer)</span>
              )}
            </div>
            {guest.email && (
              <div className="text-sm text-stone-500">{guest.email}</div>
            )}
            {guest.dietary_restrictions && (
              <div className="text-xs text-stone-400 mt-1">
                🍽️ {guest.dietary_restrictions}
              </div>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${rsvpColors[guest.rsvp_status]}`}>
            {guest.rsvp_status}
          </span>
          <button
            onClick={() => removeGuest(tripId, guest.id)}
            className="text-stone-400 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        onClick={onAddGuest}
        className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-[#722F37] hover:text-[#722F37] transition-colors"
      >
        + Add Guest
      </button>
    </div>
  );
}

// ============================================================================
// Share Tab
// ============================================================================

function ShareTab({ 
  shareCode, 
  isPublic, 
  tripId,
  status,
  onRequestHandoff 
}: { 
  shareCode: string; 
  isPublic: boolean; 
  tripId: number;
  status: string;
  onRequestHandoff: () => void;
}) {
  const updateTrip = useTripPlannerStore((state) => state.updateTrip);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/my-trips/${shareCode}` 
    : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePublic = () => {
    updateTrip(tripId, { is_public: !isPublic });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Share Link */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Share Link
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-600 text-sm"
          />
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-700 font-medium transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Public Toggle */}
      <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
        <div>
          <div className="font-medium text-stone-900">Public Link</div>
          <div className="text-sm text-stone-500">
            Anyone with the link can view your trip
          </div>
        </div>
        <button
          onClick={togglePublic}
          className={`w-12 h-7 rounded-full transition-colors ${
            isPublic ? 'bg-green-500' : 'bg-stone-300'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              isPublic ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Handoff to Walla Walla Travel */}
      {status !== 'handed_off' && status !== 'booked' && (
        <div className="border-t border-stone-200 pt-6">
          <h3 className="font-semibold text-stone-900 mb-2">
            Ready to book?
          </h3>
          <p className="text-sm text-stone-600 mb-4">
            Hand off your trip to Walla Walla Travel and we&apos;ll take care of the rest –
            booking reservations, arranging transportation, and making sure everything is perfect.
          </p>
          <button
            onClick={onRequestHandoff}
            className="w-full py-3 bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white font-medium rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>🚐</span>
            Hand Off to Walla Walla Travel
          </button>
        </div>
      )}

      {status === 'handed_off' && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-center gap-2 text-purple-700 font-medium">
            <span>✓</span>
            Trip handed off!
          </div>
          <p className="text-sm text-purple-600 mt-1">
            We&apos;ve received your trip and will be in touch shortly to finalize your booking.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Add Stop Modal
// ============================================================================

function AddStopModal({ 
  tripId, 
  onClose 
}: { 
  tripId: number; 
  onClose: () => void;
}) {
  const addStop = useTripPlannerStore((state) => state.addStop);
  const [formData, setFormData] = useState<AddStopRequest>({
    stop_type: 'winery',
    name: '',
    day_number: 1,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addStop(tripId, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">Add Stop</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Type</label>
            <select
              value={formData.stop_type}
              onChange={(e) => setFormData({ ...formData, stop_type: e.target.value as AddStopRequest['stop_type'] })}
              className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
            >
              <option value="winery">🍷 Winery</option>
              <option value="restaurant">🍽️ Restaurant</option>
              <option value="activity">🎯 Activity</option>
              <option value="accommodation">🏨 Accommodation</option>
              <option value="transportation">🚐 Transportation</option>
              <option value="custom">📌 Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., L'Ecole No 41"
              required
              className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Day</label>
            <input
              type="number"
              value={formData.day_number}
              onChange={(e) => setFormData({ ...formData, day_number: parseInt(e.target.value) || 1 })}
              min={1}
              className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Notes (optional)</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special requests or notes..."
              rows={2}
              className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-200 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#722F37] text-white rounded-xl font-medium hover:bg-[#8B1538] transition-colors"
            >
              Add Stop
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Add Guest Modal
// ============================================================================

function AddGuestModal({ 
  tripId, 
  onClose 
}: { 
  tripId: number; 
  onClose: () => void;
}) {
  const addGuest = useTripPlannerStore((state) => state.addGuest);
  const [formData, setFormData] = useState<AddGuestRequest>({
    name: '',
    email: '',
    dietary_restrictions: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addGuest(tripId, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">Add Guest</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Jane Smith"
              required
              className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Email (optional)</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jane@example.com"
              className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Dietary Restrictions (optional)</label>
            <input
              type="text"
              value={formData.dietary_restrictions || ''}
              onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
              placeholder="Vegetarian, gluten-free, etc."
              className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-200 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#722F37] text-white rounded-xl font-medium hover:bg-[#8B1538] transition-colors"
            >
              Add Guest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Handoff Modal
// ============================================================================

function HandoffModal({ 
  tripId, 
  onClose 
}: { 
  tripId: number; 
  onClose: () => void;
}) {
  const requestHandoff = useTripPlannerStore((state) => state.requestHandoff);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await requestHandoff(tripId, notes);
    if (success) {
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">Hand Off to Walla Walla Travel</h2>
        <p className="text-stone-600 text-sm mb-4">
          We&apos;ll review your trip and reach out to finalize bookings, transportation, and any special requests.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Any additional notes for our team?
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special requests, timing preferences, budget considerations..."
              rows={4}
              className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-200 rounded-xl text-stone-700 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function TripDetailPage() {
  const params = useParams();
  const _router = useRouter();
  const shareCode = params.shareCode as string;

  const loadTripByShareCode = useTripPlannerStore((state) => state.loadTripByShareCode);
  const currentTrip = useCurrentTrip();
  const isLoading = useTripLoading();
  const error = useTripError();

  const [activeTab, setActiveTab] = useState<TabType>('itinerary');
  const [showAddStop, setShowAddStop] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);

  useEffect(() => {
    loadTripByShareCode(shareCode);
  }, [shareCode, loadTripByShareCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🍷</div>
          <p className="text-stone-600">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error || !currentTrip) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Trip not found</h2>
          <p className="text-stone-600 mb-6">{error || 'This trip may have been deleted or the link is invalid.'}</p>
          <Link
            href="/my-trips"
            className="px-5 py-2.5 bg-[#722F37] text-white font-medium rounded-xl hover:bg-[#8B1538] transition-colors"
          >
            Go to My Trips
          </Link>
        </div>
      </div>
    );
  }

  const { trip, stops, guests, stats } = currentTrip;

  const tripTypeIcons: Record<string, string> = {
    wine_tour: '🍷',
    bachelorette: '💍',
    corporate: '💼',
    wedding: '💒',
    anniversary: '❤️',
    custom: '✨',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/my-trips"
            className="inline-flex items-center gap-1 text-stone-300 hover:text-white mb-3 text-sm"
          >
            ← My Trips
          </Link>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{tripTypeIcons[trip.trip_type]}</span>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold">{trip.title}</h1>
              {trip.start_date && (
                <p className="text-stone-300 text-sm mt-1">
                  {new Date(trip.start_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 flex items-center justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-stone-900">{stats.total_stops}</div>
            <div className="text-xs text-stone-500">Stops</div>
          </div>
          <div className="h-8 w-px bg-stone-200" />
          <div className="text-center">
            <div className="text-2xl font-bold text-stone-900">{stats.attending_guests}</div>
            <div className="text-xs text-stone-500">Attending</div>
          </div>
          <div className="h-8 w-px bg-stone-200" />
          <div className="text-center">
            <div className="text-2xl font-bold text-stone-900">{stats.pending_rsvps}</div>
            <div className="text-xs text-stone-500">Pending</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto mt-6">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'itinerary' && (
          <ItineraryTab 
            stops={stops} 
            tripId={trip.id}
            onAddStop={() => setShowAddStop(true)} 
          />
        )}

        {activeTab === 'guests' && (
          <GuestsTab 
            guests={guests} 
            tripId={trip.id}
            onAddGuest={() => setShowAddGuest(true)} 
          />
        )}

        {activeTab === 'share' && (
          <ShareTab 
            shareCode={trip.share_code}
            isPublic={trip.is_public}
            tripId={trip.id}
            status={trip.status}
            onRequestHandoff={() => setShowHandoff(true)}
          />
        )}
      </div>

      {/* Modals */}
      {showAddStop && (
        <AddStopModal tripId={trip.id} onClose={() => setShowAddStop(false)} />
      )}
      {showAddGuest && (
        <AddGuestModal tripId={trip.id} onClose={() => setShowAddGuest(false)} />
      )}
      {showHandoff && (
        <HandoffModal tripId={trip.id} onClose={() => setShowHandoff(false)} />
      )}
    </div>
  );
}

