'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrandEmailConfig } from '@/lib/email-brands';
import { logger } from '@/lib/logger';

interface Stop {
  id: number;
  stop_order: number;
  stop_type: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  winery?: { id: number; name: string; city?: string; slug?: string } | null;
  restaurant?: { id: number; name: string; cuisine_type?: string; address?: string } | null;
  hotel?: { id: number; name: string; type?: string; address?: string } | null;
  custom_name?: string;
  custom_address?: string;
  driver_notes: string | null;
  internal_notes: string | null;
  reservation_status: string;
  reservation_confirmation: string | null;
}

interface Day {
  id: number;
  day_number: number;
  date: string;
  title: string | null;
  notes: string | null;
  stops: Stop[];
}

interface TripProposal {
  id: number;
  proposal_number: string;
  status: string;
  brand_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  start_date: string;
  end_date: string | null;
  trip_type: string | null;
  internal_notes: string | null;
  days: Day[];
}

export default function DriverItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [proposal, setProposal] = useState<TripProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProposal = async () => {
    try {
      const response = await fetch(`/api/admin/trip-proposals/${id}`);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'TBD';
    // Time comes as HH:MM:SS, convert to 12hr format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStopName = (stop: Stop) => {
    switch (stop.stop_type) {
      case 'winery':
        return stop.winery?.name || stop.custom_name || 'Winery';
      case 'restaurant':
        return stop.restaurant?.name || stop.custom_name || 'Restaurant';
      case 'hotel':
        return stop.hotel?.name || stop.custom_name || 'Hotel';
      case 'pickup':
        return stop.custom_name || 'Pickup Location';
      case 'dropoff':
        return stop.custom_name || 'Dropoff Location';
      default:
        return stop.custom_name || 'Stop';
    }
  };

  const getStopAddress = (stop: Stop) => {
    switch (stop.stop_type) {
      case 'winery':
        // Wineries have city, not full address in the join
        return stop.winery?.city ? `${stop.winery.city}, WA` : stop.custom_address;
      case 'restaurant':
        return stop.restaurant?.address || stop.custom_address;
      case 'hotel':
        return stop.hotel?.address || stop.custom_address;
      default:
        return stop.custom_address;
    }
  };

  const getStopIcon = (stopType: string) => {
    const icons: Record<string, string> = {
      pickup: '📍',
      dropoff: '🏁',
      winery: '🍷',
      restaurant: '🍽️',
      hotel: '🏨',
      activity: '🎯',
      custom: '📌',
    };
    return icons[stopType] || '📌';
  };

  const getReservationBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
      na: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'N/A' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const generateMapsUrl = (address: string | undefined) => {
    if (!address) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const generateRouteUrl = (stops: Stop[]) => {
    const addresses = stops
      .map((stop) => getStopAddress(stop))
      .filter((addr): addr is string => !!addr);

    if (addresses.length < 2) return null;

    const origin = encodeURIComponent(addresses[0]);
    const destination = encodeURIComponent(addresses[addresses.length - 1]);
    const waypoints = addresses
      .slice(1, -1)
      .map((addr) => encodeURIComponent(addr))
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }

    return url;
  };

  const handlePrint = () => {
    window.print();
  };

  const getTripTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      wine_tour: 'Wine Tour',
      celebration: 'Celebration',
      bachelor: 'Bachelor Party',
      corporate: 'Corporate Event',
      birthday: 'Birthday Celebration',
      anniversary: 'Anniversary',
      family: 'Family Outing',
      romantic: 'Romantic Getaway',
      other: 'Custom Experience',
    };
    return type ? labels[type] || type : 'Wine Tour';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-hover"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const brandConfig = getBrandEmailConfig(proposal.brand_id ?? undefined);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
          body {
            font-size: 12pt;
          }
        }
      `}</style>

      {/* Header - No Print */}
      <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/trip-proposals/${id}`}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Proposal
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-hover flex items-center gap-2"
            >
              🖨️ Print Itinerary
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 print:px-0 print:py-0">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 print:shadow-none print:border print:border-gray-300">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Driver Itinerary</h1>
              <p className="text-gray-500">{brandConfig.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Trip #</p>
              <p className="text-xl font-bold text-brand">{proposal.proposal_number}</p>
            </div>
          </div>

          {/* Trip Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4 print:bg-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Guest</p>
              <p className="font-bold text-gray-900">{proposal.customer_name}</p>
              {proposal.customer_phone && (
                <a href={`tel:${proposal.customer_phone}`} className="text-sm text-brand">
                  {proposal.customer_phone}
                </a>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Party Size</p>
              <p className="font-bold text-gray-900">{proposal.party_size} guests</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Trip Type</p>
              <p className="font-bold text-gray-900">{getTripTypeLabel(proposal.trip_type)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Date(s)</p>
              <p className="font-bold text-gray-900">
                {formatDate(proposal.start_date).split(',')[0]}
                {proposal.end_date && proposal.end_date !== proposal.start_date && (
                  <> - {formatDate(proposal.end_date).split(',')[0]}</>
                )}
              </p>
            </div>
          </div>

          {/* Internal Notes */}
          {proposal.internal_notes && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-1">📝 Internal Notes:</p>
              <p className="text-sm text-yellow-900">{proposal.internal_notes}</p>
            </div>
          )}
        </div>

        {/* Days & Stops */}
        {proposal.days
          .sort((a, b) => a.day_number - b.day_number)
          .map((day, dayIndex) => (
            <div
              key={day.id}
              className={`bg-white rounded-lg shadow-lg overflow-hidden mb-6 print:shadow-none print:border print:border-gray-300 ${dayIndex > 0 ? 'print-break' : ''}`}
            >
              {/* Day Header */}
              <div className="bg-brand text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">
                      Day {day.day_number}: {formatDate(day.date)}
                    </h2>
                    {day.title && <p className="text-white/80">{day.title}</p>}
                  </div>
                  {day.stops.length > 0 && (
                    <a
                      href={generateRouteUrl(day.stops) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-print bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      🗺️ Open Route
                    </a>
                  )}
                </div>
              </div>

              {/* Day Notes */}
              {day.notes && (
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm text-gray-600">{day.notes}</p>
                </div>
              )}

              {/* Stops */}
              <div className="divide-y divide-gray-100">
                {day.stops.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No stops scheduled for this day
                  </div>
                ) : (
                  day.stops
                    .sort((a, b) => a.stop_order - b.stop_order)
                    .map((stop, stopIndex) => {
                      const stopName = getStopName(stop);
                      const stopAddress = getStopAddress(stop);
                      const mapsUrl = generateMapsUrl(stopAddress);

                      return (
                        <div key={stop.id} className="px-6 py-4">
                          <div className="flex items-start gap-4">
                            {/* Time Column */}
                            <div className="w-20 flex-shrink-0 text-center">
                              <span className="text-lg font-bold text-gray-900">
                                {formatTime(stop.scheduled_time)}
                              </span>
                              {stop.duration_minutes && (
                                <p className="text-xs text-gray-500">
                                  {stop.duration_minutes} min
                                </p>
                              )}
                            </div>

                            {/* Timeline */}
                            <div className="flex flex-col items-center">
                              <div className="text-2xl">{getStopIcon(stop.stop_type)}</div>
                              {stopIndex < day.stops.length - 1 && (
                                <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                              )}
                            </div>

                            {/* Stop Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-gray-900">{stopName}</h3>
                                  {stopAddress && (
                                    <p className="text-sm text-gray-600">{stopAddress}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {getReservationBadge(stop.reservation_status)}
                                  {mapsUrl && (
                                    <a
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="no-print text-brand hover:text-brand-hover"
                                      title="Open in Google Maps"
                                    >
                                      📍
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Reservation Confirmation */}
                              {stop.reservation_confirmation && (
                                <p className="text-sm text-green-700 mt-1">
                                  ✓ Confirmation: {stop.reservation_confirmation}
                                </p>
                              )}

                              {/* Driver Notes */}
                              {stop.driver_notes && (
                                <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                                  <span className="font-medium">Driver Note:</span>{' '}
                                  {stop.driver_notes}
                                </div>
                              )}

                              {/* Internal Notes */}
                              {stop.internal_notes && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                                  <span className="font-medium">Note:</span> {stop.internal_notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          ))}

        {/* Emergency Contact */}
        <div className="bg-white rounded-lg shadow-lg p-6 print:shadow-none print:border print:border-gray-300">
          <h3 className="font-bold text-gray-900 mb-3">Emergency Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Dispatch</p>
              <a href={`tel:${brandConfig.phone}`} className="font-bold text-brand">
                {brandConfig.phone}
              </a>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <a href={`mailto:${brandConfig.from_email}`} className="text-brand">
                {brandConfig.from_email}
              </a>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          Generated by {brandConfig.name} Trip Management System
        </div>
      </main>
    </div>
  );
}
