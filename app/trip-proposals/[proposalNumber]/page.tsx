'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getBrandEmailConfig } from '@/lib/email-brands';
import BrandFooter from '@/components/BrandFooter';
import { logger } from '@/lib/logger';

interface Stop {
  id: number;
  stop_order: number;
  stop_type: string;
  winery?: { id: number; name: string; image_url?: string };
  restaurant?: { id: number; name: string; cuisine_type?: string };
  hotel?: { id: number; name: string };
  custom_name?: string;
  custom_address?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  per_person_cost: string;
  flat_cost: string;
  client_notes?: string;
}

interface Day {
  id: number;
  day_number: number;
  date: string;
  title: string;
  notes?: string;
  stops: Stop[];
}

interface Guest {
  id: number;
  name: string;
  email?: string;
  dietary_restrictions?: string;
  is_primary: boolean;
}

interface Inclusion {
  id: number;
  inclusion_type: string;
  description: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

interface TripProposal {
  id: number;
  proposal_number: string;
  status: string;
  brand_id: number | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  trip_type: string;
  party_size: number;
  start_date: string;
  end_date: string | null;
  introduction: string | null;
  valid_until: string | null;
  deposit_percentage: number;
  gratuity_percentage: number;
  tax_rate: string;
  discount_amount: string;
  discount_reason: string | null;
  subtotal: string;
  taxes: string;
  total: string;
  deposit_amount: string;
  created_at: string;
  days?: Day[];
  guests?: Guest[];
  inclusions?: Inclusion[];
}

const TRIP_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  wine_tour: { icon: '🍷', label: 'Wine Tour' },
  bachelorette: { icon: '💒', label: 'Bachelorette Party' },
  corporate: { icon: '🏢', label: 'Corporate Retreat' },
  family: { icon: '👨‍👩‍👧‍👦', label: 'Family Trip' },
  romantic: { icon: '💕', label: 'Romantic Getaway' },
  birthday: { icon: '🎂', label: 'Birthday Celebration' },
  anniversary: { icon: '💍', label: 'Anniversary Trip' },
  other: { icon: '✨', label: 'Custom Experience' },
};

const STOP_TYPE_ICONS: Record<string, string> = {
  pickup: '🚗',
  dropoff: '🏁',
  winery: '🍷',
  restaurant: '🍽️',
  hotel: '🏨',
  activity: '🎈',
  custom: '📍',
};

export default function ClientTripProposalView({
  params,
}: {
  params: Promise<{ proposalNumber: string }>;
}) {
  const { proposalNumber } = use(params);
  const [proposal, setProposal] = useState<TripProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalNumber]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`/api/trip-proposals/${proposalNumber}`);

      if (!response.ok) {
        throw new Error('Proposal not found');
      }

      const data = await response.json();
      if (data.success) {
        setProposal(data.data);
      } else {
        throw new Error(data.error || 'Failed to load proposal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
      logger.error('Failed to load trip proposal', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8B1538] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your trip proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'This proposal does not exist or is not available.'}
          </p>
          <Link
            href="/"
            className="inline-block bg-[#8B1538] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#6B1028] transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = proposal.valid_until && new Date(proposal.valid_until) < new Date();
  const canAccept = ['sent', 'viewed'].includes(proposal.status) && !isExpired;
  const tripType = TRIP_TYPE_LABELS[proposal.trip_type] || TRIP_TYPE_LABELS.other;
  const brandConfig = getBrandEmailConfig(proposal.brand_id ?? undefined);
  const dayCount = proposal.days?.length || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{brandConfig.name}</h1>
              <p className="text-sm text-gray-600">{brandConfig.tagline}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Trip Proposal</p>
              <p className="text-lg font-bold text-[#8B1538]">{proposal.proposal_number}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Status Banners */}
        {isExpired && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <p className="text-amber-800 font-medium">
              This proposal expired on {formatDate(proposal.valid_until!)}. Please contact us for an
              updated proposal.
            </p>
          </div>
        )}

        {proposal.status === 'accepted' && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <p className="text-green-800 font-medium">
              ✓ This proposal has been accepted. We&apos;ll be in touch shortly to finalize details!
            </p>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-[#8B1538] to-[#6B1028] px-8 py-12 text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{tripType.icon}</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                {tripType.label}
              </span>
            </div>
            <h2 className="text-4xl font-bold mb-2">
              {dayCount}-Day Walla Walla Experience
            </h2>
            <p className="text-xl text-white/90">Prepared for {proposal.customer_name}</p>
            <div className="mt-6 flex flex-wrap gap-6 text-white/80">
              <div>
                <span className="block text-sm">Dates</span>
                <span className="font-bold text-white">
                  {formatDate(proposal.start_date)}
                  {proposal.end_date && proposal.end_date !== proposal.start_date && (
                    <> - {formatDate(proposal.end_date)}</>
                  )}
                </span>
              </div>
              <div>
                <span className="block text-sm">Party Size</span>
                <span className="font-bold text-white">
                  {proposal.party_size} guest{proposal.party_size !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Introduction */}
          {proposal.introduction && (
            <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
              <p className="text-gray-700 text-lg leading-relaxed">{proposal.introduction}</p>
            </div>
          )}
        </div>

        {/* Day-by-Day Itinerary */}
        {proposal.days && proposal.days.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Itinerary</h3>

            <div className="space-y-6">
              {proposal.days.map((day, index) => (
                <div
                  key={day.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden"
                >
                  {/* Day Header */}
                  <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-500 uppercase tracking-wide">
                          Day {index + 1}
                        </span>
                        <h4 className="text-xl font-bold text-gray-900">{day.title}</h4>
                        <p className="text-gray-600">{formatDate(day.date)}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {day.stops.length} stop{day.stops.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Stops */}
                  <div className="p-6">
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                      <div className="space-y-6">
                        {day.stops.map((stop, stopIndex) => {
                          const icon = STOP_TYPE_ICONS[stop.stop_type] || '📍';
                          const venueName =
                            stop.winery?.name ||
                            stop.restaurant?.name ||
                            stop.hotel?.name ||
                            stop.custom_name ||
                            'Stop';
                          const totalCost =
                            parseFloat(stop.flat_cost) +
                            parseFloat(stop.per_person_cost) * proposal.party_size;

                          return (
                            <div key={stop.id} className="relative pl-16">
                              {/* Timeline Dot */}
                              <div className="absolute left-4 w-5 h-5 bg-[#8B1538] rounded-full border-4 border-white shadow"></div>

                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-2xl">{icon}</span>
                                      <h5 className="font-bold text-gray-900">{venueName}</h5>
                                    </div>
                                    {stop.scheduled_time && (
                                      <p className="text-sm text-gray-600">
                                        {formatTime(stop.scheduled_time)}
                                        {stop.duration_minutes && (
                                          <span> • {stop.duration_minutes} min</span>
                                        )}
                                      </p>
                                    )}
                                    {stop.custom_address && (
                                      <p className="text-sm text-gray-500 mt-1">
                                        {stop.custom_address}
                                      </p>
                                    )}
                                    {stop.client_notes && (
                                      <p className="text-sm text-gray-600 mt-2 italic">
                                        {stop.client_notes}
                                      </p>
                                    )}
                                  </div>
                                  {totalCost > 0 && (
                                    <span className="font-bold text-[#8B1538]">
                                      {formatCurrency(totalCost)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Included Services */}
        {proposal.inclusions && proposal.inclusions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">What&apos;s Included</h3>
            <div className="space-y-4">
              {proposal.inclusions.map((inclusion) => (
                <div
                  key={inclusion.id}
                  className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-green-500 text-xl">✓</span>
                    <div>
                      <p className="font-medium text-gray-900">{inclusion.description}</p>
                      {inclusion.quantity > 1 && (
                        <p className="text-sm text-gray-600">Quantity: {inclusion.quantity}</p>
                      )}
                    </div>
                  </div>
                  {parseFloat(inclusion.total_price) > 0 && (
                    <span className="font-bold text-gray-900">
                      {formatCurrency(inclusion.total_price)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guests */}
        {proposal.guests && proposal.guests.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Party</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposal.guests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="font-bold text-gray-900">
                      {guest.name}
                      {guest.is_primary && (
                        <span className="ml-2 text-xs bg-[#8B1538] text-white px-2 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </p>
                    {guest.email && <p className="text-sm text-gray-600">{guest.email}</p>}
                    {guest.dietary_restrictions && (
                      <p className="text-sm text-gray-600 mt-1">
                        🍽️ {guest.dietary_restrictions}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Investment</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(proposal.subtotal)}</span>
            </div>

            {parseFloat(proposal.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Discount
                  {proposal.discount_reason && (
                    <span className="text-sm text-gray-600 ml-2">({proposal.discount_reason})</span>
                  )}
                </span>
                <span className="font-semibold">-{formatCurrency(proposal.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-700">
              <span>Tax ({parseFloat(proposal.tax_rate)}%)</span>
              <span className="font-semibold">{formatCurrency(proposal.taxes)}</span>
            </div>

            <div className="border-t-2 border-gray-300 pt-3 flex justify-between text-xl font-bold text-gray-900">
              <span>Total</span>
              <span className="text-[#8B1538]">{formatCurrency(proposal.total)}</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <div className="flex justify-between text-gray-700">
                <span>Deposit Required ({proposal.deposit_percentage}%)</span>
                <span className="font-bold text-[#8B1538]">
                  {formatCurrency(proposal.deposit_amount)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Remaining balance due 48 hours after your tour concludes
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canAccept && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Book Your Experience?
              </h3>
              {proposal.valid_until && (
                <p className="text-gray-600 mb-6">
                  This proposal is valid until {formatDate(proposal.valid_until)}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href={`/trip-proposals/${proposalNumber}/accept`}
                  className="inline-block bg-[#8B1538] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#6B1028] transition-colors shadow-lg hover:shadow-xl"
                >
                  ✓ Accept Proposal
                </Link>
                <a
                  href={`mailto:${brandConfig.reply_to}?subject=Question about ${proposal.proposal_number}`}
                  className="inline-block bg-white text-gray-700 border-2 border-gray-300 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  Have Questions?
                </a>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Questions? Call us at{' '}
                <a
                  href={`tel:${brandConfig.phone.replace(/[^+\d]/g, '')}`}
                  className="text-[#8B1538] hover:underline"
                >
                  {brandConfig.phone}
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Contact Section for non-actionable states */}
        {!canAccept && proposal.status !== 'accepted' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 text-center">
            <p className="text-gray-700 mb-4">Have questions or need to make changes?</p>
            <a
              href={`mailto:${brandConfig.reply_to}?subject=Proposal ${proposal.proposal_number}`}
              className="inline-block bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Contact Us
            </a>
          </div>
        )}
      </main>

      {/* Footer */}
      <BrandFooter brandId={proposal.brand_id ?? undefined} />
    </div>
  );
}
