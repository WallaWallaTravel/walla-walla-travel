'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TourOffer {
  id: number;
  booking_id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  pickup_location: string;
  vehicle_name: string;
  estimated_hours: number;
  hourly_rate: number;
  total_pay: number;
  offered_at: string;
  expires_at: string;
  notes: string;
  status: string;
}

export default function DriverOffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<TourOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<number | null>(null);

  useEffect(() => {
    loadOffers();
    // Poll for new offers every 30 seconds
    const interval = setInterval(loadOffers, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOffers = async () => {
    try {
      // TODO: Get actual driver ID from session
      const driverId = 1; // Placeholder
      
      const response = await fetch(`/api/driver/offers?driver_id=${driverId}`);
      const data = await response.json();
      setOffers(data.offers || []);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (offerId: number, action: 'accept' | 'decline', notes?: string) => {
    setResponding(offerId);
    
    try {
      const response = await fetch(`/api/driver/offers/${offerId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      if (response.ok) {
        const data = await response.json();
        if (action === 'accept') {
          alert('✅ Tour accepted! You have been assigned to this booking.');
        } else {
          alert('Tour declined.');
        }
        loadOffers();
      } else {
        throw new Error('Failed to respond to offer');
      }
    } catch (error) {
      console.error('Error responding to offer:', error);
      alert('Failed to respond. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  const handleAccept = (offer: TourOffer) => {
    if (confirm(`Accept this tour for ${offer.customer_name} on ${new Date(offer.tour_date).toLocaleDateString()}?`)) {
      handleResponse(offer.id, 'accept');
    }
  };

  const handleDecline = (offer: TourOffer) => {
    const notes = prompt('Optional: Why are you declining this tour?');
    if (notes !== null) {
      handleResponse(offer.id, 'decline', notes);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tour offers...</p>
        </div>
      </div>
    );
  }

  const pendingOffers = offers.filter(o => o.status === 'pending');
  const respondedOffers = offers.filter(o => o.status !== 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white">🚗 Tour Offers</h1>
          <p className="text-blue-100 text-lg mt-1">Review and respond to tour offers from dispatch</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4">

        {/* Pending Offers */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Pending Offers ({pendingOffers.length})
          </h2>

          {pendingOffers.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-gray-600">No pending tour offers</p>
              <p className="text-sm text-gray-500 mt-2">
                Check back later or contact dispatch
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingOffers.map(offer => {
                const expiresIn = new Date(offer.expires_at).getTime() - Date.now();
                const hoursUntilExpiry = Math.floor(expiresIn / (1000 * 60 * 60));
                const isExpiringSoon = hoursUntilExpiry < 24;

                return (
                  <div
                    key={offer.id}
                    className={`bg-white rounded-lg shadow-lg p-6 ${
                      isExpiringSoon ? 'border-2 border-orange-400' : ''
                    }`}
                  >
                    {isExpiringSoon && (
                      <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-3">
                        ⏰ Expires in {hoursUntilExpiry}h
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Left Column */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          {offer.customer_name}
                        </h3>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start">
                            <span className="text-gray-500 w-24">Booking:</span>
                            <span className="font-semibold">{offer.booking_number}</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 w-24">Date:</span>
                            <span className="font-semibold">
                              {new Date(offer.tour_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 w-24">Time:</span>
                            <span className="font-semibold">
                              {offer.start_time} - {offer.end_time}
                            </span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 w-24">Duration:</span>
                            <span className="font-semibold">{offer.estimated_hours} hours</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 w-24">Party Size:</span>
                            <span className="font-semibold">{offer.party_size} guests</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-gray-500 w-24">Vehicle:</span>
                            <span className="font-semibold">{offer.vehicle_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div>
                        <div className="bg-blue-50 rounded-lg p-4 mb-4">
                          <div className="text-sm text-gray-600 mb-1">Your Pay</div>
                          <div className="text-3xl font-bold text-blue-600">
                            ${offer.total_pay.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ${offer.hourly_rate}/hr × {offer.estimated_hours} hours
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm font-semibold text-gray-700 mb-2">
                            📍 Pickup Location
                          </div>
                          <div className="text-sm text-gray-600">
                            {offer.pickup_location}
                          </div>
                        </div>

                        {offer.notes && (
                          <div className="mt-4 bg-yellow-50 rounded-lg p-4">
                            <div className="text-sm font-semibold text-gray-700 mb-2">
                              📝 Notes from Dispatch
                            </div>
                            <div className="text-sm text-gray-600">
                              {offer.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleDecline(offer)}
                        disabled={responding === offer.id}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        ❌ Decline
                      </button>
                      <button
                        onClick={() => handleAccept(offer)}
                        disabled={responding === offer.id}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {responding === offer.id ? 'Processing...' : '✅ Accept Tour'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Response History */}
        {respondedOffers.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Responses
            </h2>
            <div className="space-y-3">
              {respondedOffers.slice(0, 5).map(offer => (
                <div
                  key={offer.id}
                  className="bg-white rounded-lg shadow p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-gray-900">
                      {offer.customer_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(offer.tour_date).toLocaleDateString()} • {offer.start_time}
                    </div>
                  </div>
                  <div>
                    {offer.status === 'accepted' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        ✓ Accepted
                      </span>
                    )}
                    {offer.status === 'declined' && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                        Declined
                      </span>
                    )}
                    {offer.status === 'expired' && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                        Expired
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

