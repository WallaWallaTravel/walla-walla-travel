'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';
import PhoneInput from '@/components/ui/PhoneInput';

interface Props {
  onClose: () => void;
  onComplete: () => void;
}

export default function ManualBookingModal({ onClose, onComplete }: Props) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    tour_date: '',
    start_time: '10:00',
    duration_hours: 6,
    party_size: 2,
    pickup_location: '',
    special_requests: '',
    payment_status: 'pending',
    payment_method: 'phone',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pricing, setPricing] = useState<{ subtotal: number; taxes: number; total: number; deposit_required: number } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Recalculate pricing when relevant fields change
    if (['tour_date', 'duration_hours', 'party_size'].includes(name)) {
      calculatePricing();
    }
  };

  const calculatePricing = async () => {
    if (!formData.tour_date || !formData.duration_hours || !formData.party_size) {
      return;
    }

    try {
      const response = await fetch('/api/bookings/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.tour_date,
          duration_hours: parseInt(String(formData.duration_hours)),
          party_size: parseInt(String(formData.party_size)),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setPricing(result.data.pricing);
      }
    } catch (err) {
      logger.error('Failed to calculate pricing', { error: err });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Create booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          tour_date: formData.tour_date,
          start_time: formData.start_time,
          party_size: parseInt(String(formData.party_size)),
          duration_hours: parseInt(String(formData.duration_hours)),
          pickup_location: formData.pickup_location,
          dropoff_location: formData.pickup_location,
          special_requests: formData.special_requests,
          base_price: pricing?.subtotal || 0,
          total_price: pricing?.total || 0,
          deposit_amount: pricing?.deposit_required || 0,
          final_payment_amount: pricing ? pricing.total - pricing.deposit_required : 0,
          status: 'confirmed',
          booking_source: 'phone',
        }),
      });

      if (!bookingResponse.ok) {
        throw new Error('Failed to create booking');
      }

      const bookingResult = await bookingResponse.json();
      const booking = bookingResult.booking;

      // Create empty itinerary
      await fetch('/api/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          pickup_location: formData.pickup_location,
          pickup_time: formData.start_time,
          dropoff_location: formData.pickup_location,
          estimated_dropoff_time: calculateEndTime(formData.start_time, parseInt(String(formData.duration_hours))),
          driver_notes: `Phone booking for ${formData.party_size} guests`,
          internal_notes: formData.special_requests,
          stops: [],
        }),
      });

      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  const calculateEndTime = (startTime: string, hours: number): string => {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Create Manual Booking</h2>
              <p className="text-purple-100 mt-1">Phone or in-person booking</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 text-3xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Phone <span className="text-red-600">*</span>
                  </label>
                  <PhoneInput
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={(value) => setFormData(prev => ({ ...prev, customer_phone: value }))}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Tour Details */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Tour Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Tour Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="tour_date"
                    value={formData.tour_date}
                    onChange={handleChange}
                    min={getMinDate()}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Start Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Duration <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="duration_hours"
                    value={formData.duration_hours}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  >
                    <option value="5">5 hours</option>
                    <option value="6">6 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Party Size <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    name="party_size"
                    value={formData.party_size}
                    onChange={handleChange}
                    min="1"
                    max="14"
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Pickup Location <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="pickup_location"
                    value={formData.pickup_location}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                    placeholder="Hotel name and address"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Special Requests
                  </label>
                  <textarea
                    name="special_requests"
                    value={formData.special_requests}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                    placeholder="Dietary restrictions, celebrations, wine preferences..."
                  />
                </div>
              </div>
            </div>

            {/* Pricing Display */}
            {pricing && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Pricing</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-bold text-gray-900">${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Taxes:</span>
                    <span className="font-bold text-gray-900">${pricing.taxes.toFixed(2)}</span>
                  </div>
                  <div className="border-t-2 border-green-300 pt-2 flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-green-600">${pricing.total.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Deposit: ${pricing.deposit_required.toFixed(2)}</p>
                    <p>Balance: ${(pricing.total - pricing.deposit_required).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Status */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Payment Method
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  >
                    <option value="phone">Phone</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="card">Card (manual)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Payment Status
                  </label>
                  <select
                    name="payment_status"
                    value={formData.payment_status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="deposit_paid">Deposit Paid</option>
                    <option value="paid_full">Paid in Full</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">⚠️ {error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 mt-6 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-900 rounded-lg font-bold text-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !pricing}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors"
            >
              {saving ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

