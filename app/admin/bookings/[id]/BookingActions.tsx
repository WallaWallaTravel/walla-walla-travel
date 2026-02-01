'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BookingActionsProps {
  bookingId: number;
  bookingNumber: string;
  status: string;
  customerEmail: string;
}

export function BookingActions({ bookingId, bookingNumber, status, customerEmail }: BookingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!confirm('Confirm this booking? The customer will be notified.')) return;

    setLoading('confirm');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm booking');
      }

      setSuccess('Booking confirmed successfully');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking');
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (reason === null) return; // User clicked cancel on prompt

    setLoading('cancel');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      setSuccess('Booking cancelled successfully');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setLoading(null);
    }
  };

  const handleSendReminder = async () => {
    if (!customerEmail) {
      setError('No customer email on file');
      return;
    }

    if (!confirm(`Send reminder email to ${customerEmail}?`)) return;

    setLoading('reminder');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/bookings/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_number: bookingNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setSuccess(data.message || 'Email sent successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setLoading(null);
    }
  };

  const handleViewItinerary = () => {
    window.open(`/trip/${bookingNumber}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE this booking?\n\n${bookingNumber}\n\nThis action cannot be undone.`)) return;

    // Double confirm for safety
    if (!confirm('This will permanently remove the booking and all related data. Are you absolutely sure?')) return;

    setLoading('delete');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to delete booking');
      }

      setSuccess('Booking deleted successfully. Redirecting...');
      setTimeout(() => {
        router.push('/admin/bookings');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete booking');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>

      {/* Status messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {status === 'pending' && (
          <button
            onClick={handleConfirm}
            disabled={loading !== null}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading === 'confirm' ? (
              <>
                <span className="animate-spin">⏳</span>
                Confirming...
              </>
            ) : (
              <>✓ Confirm Booking</>
            )}
          </button>
        )}

        <button
          onClick={handleSendReminder}
          disabled={loading !== null}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading === 'reminder' ? (
            <>
              <span className="animate-spin">⏳</span>
              Sending...
            </>
          ) : (
            <>✉️ Send Reminder Email</>
          )}
        </button>

        <button
          onClick={handleViewItinerary}
          className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors"
        >
          📋 View Itinerary
        </button>

        <button
          onClick={handlePrint}
          className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors"
        >
          🖨️ Print Details
        </button>

        {status !== 'cancelled' && status !== 'completed' && (
          <button
            onClick={handleCancel}
            disabled={loading !== null}
            className="w-full border border-red-300 hover:bg-red-50 disabled:opacity-50 text-red-600 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading === 'cancel' ? (
              <>
                <span className="animate-spin">⏳</span>
                Cancelling...
              </>
            ) : (
              <>✕ Cancel Booking</>
            )}
          </button>
        )}

        {/* Delete button - always visible for admin */}
        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading === 'delete' ? (
            <>
              <span className="animate-spin">⏳</span>
              Deleting...
            </>
          ) : (
            <>🗑️ Delete Booking</>
          )}
        </button>
      </div>
    </div>
  );
}
