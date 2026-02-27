'use client';

/**
 * CustomerPanel Component
 *
 * Left panel of the booking console containing:
 * - Customer information (name, email, phone, can_text)
 * - Tour details (date, time, duration, party size, tour type)
 * - Pickup location
 * - Notes (special requests, wine preferences)
 * - Referral source
 */

import {
  CustomerPanelProps,
  CustomerInfo,
  TourDetails,
  REFERRAL_OPTIONS,
  TOUR_TYPE_OPTIONS,
} from './types';
import PhoneInput from '@/components/ui/PhoneInput';

export default function CustomerPanel({
  customer,
  tour,
  errors,
  onCustomerChange,
  onTourChange,
}: CustomerPanelProps) {
  const handleCustomerInput = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;
    const fieldName = name as keyof CustomerInfo;
    onCustomerChange({
      [fieldName]: type === 'checkbox' ? checked : value,
    });
  };

  const handleTourInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as keyof TourDetails;

    // Handle numeric fields
    if (name === 'party_size') {
      onTourChange({ [fieldName]: parseInt(value, 10) || 0 });
    } else if (name === 'duration_hours') {
      onTourChange({ [fieldName]: parseFloat(value) || 0 });
    } else if (name === 'custom_price') {
      // Custom price: null if empty, otherwise parse as float
      const numValue = value === '' ? null : parseFloat(value) || 0;
      onTourChange({ [fieldName]: numValue });
    } else {
      onTourChange({ [fieldName]: value });
    }
  };

  // Admin can book any date - no minimum restriction

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">👤</span> Customer Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-bold text-gray-900 mb-2">
              First Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={customer.first_name}
              onChange={handleCustomerInput}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.first_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="John"
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-bold text-gray-900 mb-2">
              Last Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={customer.last_name}
              onChange={handleCustomerInput}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.last_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Smith"
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-2">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={customer.email}
              onChange={handleCustomerInput}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-bold text-gray-900 mb-2">
              Phone <span className="text-red-600">*</span>
            </label>
            <PhoneInput
              id="phone"
              name="phone"
              value={customer.phone}
              onChange={(value) => onCustomerChange({ phone: value })}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="(509) 555-1234"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="can_text"
                checked={customer.can_text}
                onChange={handleCustomerInput}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-semibold text-gray-700">
                Customer consents to receive text messages
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Tour Details */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">🍷</span> Tour Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-bold text-gray-900 mb-2">
              Tour Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={tour.date}
              onChange={handleTourInput}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          <div>
            <label htmlFor="start_time" className="block text-sm font-bold text-gray-900 mb-2">
              Start Time <span className="text-red-600">*</span>
            </label>
            <input
              type="time"
              id="start_time"
              name="start_time"
              value={tour.start_time}
              onChange={handleTourInput}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.start_time ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.start_time && (
              <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>
            )}
          </div>

          <div>
            <label htmlFor="duration_hours" className="block text-sm font-bold text-gray-900 mb-2">
              Duration (hours)
            </label>
            <input
              type="number"
              id="duration_hours"
              name="duration_hours"
              value={tour.duration_hours}
              onChange={handleTourInput}
              min={0}
              max={24}
              step={0.1}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="6"
            />
          </div>

          <div>
            <label htmlFor="party_size" className="block text-sm font-bold text-gray-900 mb-2">
              Party Size <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              id="party_size"
              name="party_size"
              value={tour.party_size}
              onChange={handleTourInput}
              min={1}
              max={50}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.party_size ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.party_size && (
              <p className="mt-1 text-sm text-red-600">{errors.party_size}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="tour_type" className="block text-sm font-bold text-gray-900 mb-2">
              Tour Type
            </label>
            <select
              id="tour_type"
              name="tour_type"
              value={tour.tour_type}
              onChange={handleTourInput}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {TOUR_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Locations */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">📍</span> Locations
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="pickup_location" className="block text-sm font-bold text-gray-900 mb-2">
              Pickup Location <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="pickup_location"
              name="pickup_location"
              value={tour.pickup_location}
              onChange={handleTourInput}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.pickup_location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Marcus Whitman Hotel, 6 W Rose St, Walla Walla"
            />
            {errors.pickup_location && (
              <p className="mt-1 text-sm text-red-600">{errors.pickup_location}</p>
            )}
          </div>

          <div>
            <label htmlFor="dropoff_location" className="block text-sm font-bold text-gray-900 mb-2">
              Dropoff Location
              <span className="text-gray-500 font-normal ml-2">(if different from pickup)</span>
            </label>
            <input
              type="text"
              id="dropoff_location"
              name="dropoff_location"
              value={tour.dropoff_location}
              onChange={handleTourInput}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Tri-Cities Airport, PSC"
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">📝</span> Notes
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="special_requests" className="block text-sm font-bold text-gray-900 mb-2">
              Special Requests
            </label>
            <textarea
              id="special_requests"
              name="special_requests"
              value={tour.special_requests}
              onChange={handleTourInput}
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Dietary restrictions, accessibility needs, celebrations..."
            />
          </div>

          <div>
            <label htmlFor="wine_preferences" className="block text-sm font-bold text-gray-900 mb-2">
              Wine Preferences
            </label>
            <textarea
              id="wine_preferences"
              name="wine_preferences"
              value={tour.wine_preferences}
              onChange={handleTourInput}
              rows={2}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Red wines preferred, interested in Cab Franc, etc."
            />
          </div>
        </div>
      </section>

      {/* Referral Source */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">📣</span> How Did You Hear About Us?
        </h3>
        <div>
          <select
            id="how_did_you_hear"
            name="how_did_you_hear"
            value={tour.how_did_you_hear}
            onChange={handleTourInput}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {REFERRAL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Custom/Negotiated Price */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">💵</span> Negotiated Price
          <span className="text-sm font-normal text-gray-500">(optional)</span>
        </h3>
        <div>
          <label htmlFor="custom_price" className="block text-sm font-bold text-gray-900 mb-2">
            Override Total Price
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
            <input
              type="number"
              id="custom_price"
              name="custom_price"
              value={tour.custom_price ?? ''}
              onChange={handleTourInput}
              min={0}
              step={0.01}
              className="w-full pl-8 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Leave blank to use calculated price"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Enter a custom price to override the calculated total. Leave blank to use standard pricing.
          </p>
        </div>
      </section>
    </div>
  );
}
