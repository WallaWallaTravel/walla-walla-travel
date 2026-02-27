'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTripPlannerStore } from '@/lib/stores/trip-planner';
import { TripType, TripPreferences } from '@/lib/types/trip-planner';
import { getItineraryBySlug, type Itinerary } from '@/lib/data/itineraries';
import PhoneInput from '@/components/ui/PhoneInput';

// ============================================================================
// Trip Type Options
// ============================================================================

const tripTypes: { value: TripType; label: string; icon: string; description: string }[] = [
  { value: 'wine_tour', label: 'Wine Tour', icon: '🍷', description: 'Classic wine tasting adventure' },
  { value: 'bachelorette', label: 'Bachelorette', icon: '🎉', description: 'Bachelorette party or celebration' },
  { value: 'corporate', label: 'Corporate', icon: '💼', description: 'Team building or client event' },
  { value: 'wedding', label: 'Wedding', icon: '💒', description: 'Wedding party or rehearsal' },
  { value: 'anniversary', label: 'Anniversary', icon: '❤️', description: 'Romantic celebration' },
  { value: 'custom', label: 'Custom', icon: '✨', description: 'Something unique' },
];

// ============================================================================
// New Trip Page
// ============================================================================

function NewTripForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createTrip = useTripPlannerStore((state) => state.createTrip);
  const addStop = useTripPlannerStore((state) => state.addStop);
  const isSaving = useTripPlannerStore((state) => state.isSaving);
  const error = useTripPlannerStore((state) => state.error);

  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<Itinerary | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    trip_type: 'wine_tour' as TripType,
    start_date: '',
    end_date: '',
    dates_flexible: true,
    expected_guests: 2,
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    description: '',
    preferences: {
      transportation: 'undecided' as TripPreferences['transportation'],
      pace: 'moderate' as TripPreferences['pace'],
      budget: 'moderate' as TripPreferences['budget'],
    } as TripPreferences,
  });

  // Load template if provided
  useEffect(() => {
    const templateSlug = searchParams.get('template');
    if (templateSlug) {
      const itinerary = getItineraryBySlug(templateSlug);
      if (itinerary) {
        setTemplate(itinerary);
        // Pre-fill form with template data
        setFormData(prev => ({
          ...prev,
          title: `My ${itinerary.shortTitle}`,
          description: itinerary.description,
        }));
      }
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    const result = await createTrip(formData);
    if (result) {
      // If we have a template, add the stops from it
      if (template) {
        // Add stops from each day of the template
        for (const day of template.days) {
          for (const stop of day.stops) {
            // Map itinerary stop type to trip stop type
            const stopType = stop.type === 'lodging' ? 'accommodation' : stop.type;
            await addStop(result.share_code, {
              name: stop.name,
              stop_type: stopType as 'winery' | 'restaurant' | 'activity' | 'accommodation',
              day_number: day.dayNumber,
              notes: stop.description + (stop.tip ? `\n\nTip: ${stop.tip}` : ''),
              planned_arrival: stop.time,
            });
          }
        }
      }
      router.push(`/my-trips/${result.share_code}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/my-trips"
            className="inline-flex items-center gap-1 text-stone-300 hover:text-white mb-4 text-sm"
          >
            ← Back to My Trips
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Create New Trip</h1>
          <p className="text-stone-300 mt-1">
            {template ? (
              <>Using template: <span className="text-white font-medium">{template.shortTitle}</span></>
            ) : (
              <>Let&apos;s plan your perfect Walla Walla adventure</>
            )}
          </p>
          {template && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-sm">
              <span>Based on {template.duration} itinerary</span>
              <span className="text-white/60">•</span>
              <span>{template.days.reduce((acc, day) => acc + day.stops.length, 0)} stops included</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s === step
                    ? 'bg-[#722F37] text-white'
                    : s < step
                    ? 'bg-green-500 text-white'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded ${
                    s < step ? 'bg-green-500' : 'bg-stone-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Trip Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-semibold text-stone-900 mb-4">
                What kind of trip are you planning?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {tripTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, trip_type: type.value })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.trip_type === type.value
                        ? 'border-[#722F37] bg-[#722F37]/5'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <div className="mt-2 font-medium text-stone-900">{type.label}</div>
                    <div className="text-xs text-stone-500">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Give your trip a name
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Birthday Wine Tour"
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37] focus:border-transparent"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!formData.title.trim()}
                className="px-6 py-3 bg-[#722F37] text-white font-medium rounded-xl hover:bg-[#8B1538] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.dates_flexible}
                onChange={(e) => setFormData({ ...formData, dates_flexible: e.target.checked })}
                className="w-5 h-5 rounded border-stone-300 text-[#722F37] focus:ring-[#722F37]"
              />
              <span className="text-stone-700">Dates are flexible</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                How many guests?
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setFormData({ ...formData, expected_guests: Math.max(1, formData.expected_guests - 1) })}
                  className="w-12 h-12 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold text-xl text-stone-700"
                >
                  −
                </button>
                <span className="text-2xl font-bold text-stone-900 w-12 text-center">
                  {formData.expected_guests}
                </span>
                <button
                  onClick={() => setFormData({ ...formData, expected_guests: Math.min(50, formData.expected_guests + 1) })}
                  className="w-12 h-12 bg-stone-100 hover:bg-stone-200 rounded-xl font-bold text-xl text-stone-700"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Need transportation?
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'need_driver', label: 'Yes, book a driver' },
                  { value: 'self_drive', label: 'No, we\'ll drive' },
                  { value: 'undecided', label: 'Not sure yet' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, transportation: opt.value as TripPreferences['transportation'] },
                    })}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      formData.preferences.transportation === opt.value
                        ? 'border-[#722F37] bg-[#722F37]/5 text-[#722F37]'
                        : 'border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 text-stone-600 font-medium hover:text-stone-900 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-[#722F37] text-white font-medium rounded-xl hover:bg-[#8B1538] transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && (
          <div className="space-y-6">
            <p className="text-stone-600">
              Add your contact info so we can reach you about your trip. This is optional but recommended.
            </p>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                placeholder="jane@example.com"
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Phone (optional)
              </label>
              <PhoneInput
                value={formData.owner_phone}
                onChange={(value) => setFormData({ ...formData, owner_phone: value })}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Any special notes? (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell us about your group, preferences, or anything special..."
                rows={3}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#722F37] resize-none"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 text-stone-600 font-medium hover:text-stone-900 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white font-medium rounded-xl hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">🍷</span>
                    Creating...
                  </>
                ) : (
                  <>
                    Create Trip
                    <span>✨</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function NewTripFormLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="h-4 w-24 bg-white/20 rounded animate-pulse mb-4" />
          <div className="h-8 w-64 bg-white/30 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-white/20 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="h-8 w-full bg-stone-200 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          <div className="h-32 w-full bg-stone-100 rounded-xl animate-pulse" />
          <div className="h-12 w-full bg-stone-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Export with Suspense wrapper for useSearchParams
export default function NewTripPage() {
  return (
    <Suspense fallback={<NewTripFormLoading />}>
      <NewTripForm />
    </Suspense>
  );
}
