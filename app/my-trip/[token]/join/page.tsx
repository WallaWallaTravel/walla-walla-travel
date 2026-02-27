'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import PhoneInput from '@/components/ui/PhoneInput';

interface TripInfo {
  trip_title: string;
  start_date: string;
  end_date: string | null;
  at_capacity: boolean;
  max_guests: number | null;
  guest_count?: number;
  min_guests?: number;
  spots_remaining?: number | null;
  dynamic_pricing?: {
    current_per_person: number;
    ceiling_price: number;
    floor_price: number;
    min_guests: number | null;
    max_guests: number | null;
  };
}

export default function JoinTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTripInfo = async () => {
      try {
        const res = await fetch(`/api/my-trip/${token}/join`);
        const result = await res.json();
        if (result.success) {
          setTripInfo(result.data);
        } else {
          setError(result.error || 'Trip not found');
        }
      } catch {
        setError('Unable to load trip information');
      } finally {
        setLoading(false);
      }
    };
    loadTripInfo();
  }, [token]);

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/my-trip/${token}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });
      const result = await res.json();

      if (result.success) {
        setSubmitted(true);
        setSubmitMessage(result.message);

        // If auto-approved, redirect to their guest view after a moment
        if (!result.data.needs_approval) {
          setTimeout(() => {
            router.push(`/my-trip/${token}?guest=${result.data.guest_access_token}`);
          }, 2000);
        }
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-8" />
            <div className="space-y-4">
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !tripInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Join</h1>
            <p className="text-gray-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Trip is full
  if (tripInfo?.at_capacity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Trip Full</h1>
            <p className="text-gray-700">
              This trip has reached its maximum capacity of {tripInfo.max_guests} guests.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {submitMessage || "You're registered!"}
            </h1>
            <p className="text-gray-700 leading-relaxed">
              {submitMessage.includes('approval')
                ? "Your registration has been submitted. You'll receive access once the trip organizer approves it."
                : "Redirecting you to your trip details..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Trip Header */}
          <div className="bg-indigo-600 px-8 py-6 text-white">
            <h1 className="text-xl font-bold mb-1">
              {tripInfo?.trip_title || 'Join This Trip'}
            </h1>
            <p className="text-indigo-200 text-sm">
              {tripInfo?.start_date && formatDate(tripInfo.start_date)}
              {tripInfo?.end_date && tripInfo.end_date !== tripInfo.start_date && (
                <> &ndash; {formatDate(tripInfo.end_date)}</>
              )}
            </p>
          </div>

          <div className="p-8">
            {/* Guest count info (if visible) */}
            {tripInfo?.guest_count !== undefined && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">
                    <span className="font-bold text-gray-900">{tripInfo.guest_count}</span> guest{tripInfo.guest_count !== 1 ? 's' : ''} registered
                  </span>
                  {tripInfo.spots_remaining !== null && tripInfo.spots_remaining !== undefined && (
                    <span className="font-semibold text-indigo-600">
                      {tripInfo.spots_remaining} spot{tripInfo.spots_remaining !== 1 ? 's' : ''} left
                    </span>
                  )}
                </div>
                {tripInfo.min_guests && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${tripInfo.guest_count >= tripInfo.min_guests ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, (tripInfo.guest_count / tripInfo.min_guests) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {tripInfo.guest_count >= tripInfo.min_guests
                        ? 'Minimum reached — trip confirmed!'
                        : `${tripInfo.min_guests - tripInfo.guest_count} more needed for trip to proceed`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic pricing info */}
            {tripInfo?.dynamic_pricing && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Estimated cost: {formatCurrency(tripInfo.dynamic_pricing.ceiling_price)}/person
                </p>
                <p className="text-xs text-gray-700">
                  Based on {tripInfo.dynamic_pricing.min_guests} guests minimum. Price drops as more guests join
                  {tripInfo.dynamic_pricing.max_guests && (
                    <> &mdash; as low as {formatCurrency(tripInfo.dynamic_pricing.floor_price)}/person with {tripInfo.dynamic_pricing.max_guests} guests</>
                  )}.
                </p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors({ ...formErrors, name: '' }); }}
                  placeholder="Your name"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors({ ...formErrors, email: '' }); }}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {formErrors.email && <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Phone <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <PhoneInput
                  value={form.phone}
                  onChange={(value) => setForm({ ...form, phone: value })}
                  placeholder="(555) 000-0000"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                aria-label={submitting ? 'Registering for trip' : 'Register to join this trip'}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Registering...' : 'Join This Trip'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
