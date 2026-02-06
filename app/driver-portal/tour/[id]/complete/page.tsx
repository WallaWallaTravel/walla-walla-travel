'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TourCompletionFlow } from '@/components/driver-portal/TourCompletionFlow';

interface TourInfo {
  id: number;
  booking_id: number;
  booking_number?: string;
  customer_name: string;
  tour_date: string;
  status: string;
}

/**
 * Tour Completion Page
 *
 * Mobile-optimized full-screen flow for completing a tour
 * Includes lunch expense entry, receipt capture, and QR code generation
 */
export default function TourCompletePage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [tour, setTour] = useState<TourInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      loadTourInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const loadTourInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/driver/tours/${bookingId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Tour not found or you do not have access.');
        } else {
          throw new Error('Failed to load tour');
        }
        return;
      }

      const data = await response.json();
      const tourData = data.tour || data.data || data;

      // Check if already completed
      if (tourData.status === 'completed') {
        // Redirect to completion status page
        router.push(`/driver-portal/tour/${bookingId}`);
        return;
      }

      setTour({
        id: tourData.id,
        booking_id: tourData.booking_id || parseInt(bookingId),
        booking_number: tourData.booking_number || `${tourData.booking_id}`,
        customer_name: tourData.customer_name,
        tour_date: tourData.tour_date,
        status: tourData.status,
      });
    } catch (err) {
      setError('Failed to load tour details.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    // Go back to tour detail page
    router.push(`/driver-portal/tour/${bookingId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-gray-600">Loading tour...</p>
      </div>
    );
  }

  if (error || !tour) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
        <p className="text-gray-600 mb-6 text-center">{error || 'Could not load tour.'}</p>
        <button
          onClick={() => router.push('/driver-portal/dashboard')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <TourCompletionFlow
      bookingId={tour.booking_id}
      bookingNumber={tour.booking_number || String(tour.booking_id)}
      customerName={tour.customer_name}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
