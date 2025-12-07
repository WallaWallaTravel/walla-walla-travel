'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Book a Tour - Entry Point
 * 
 * This is the main booking flow for customers.
 * Can be embedded in Webflow via iframe or loaded directly.
 * 
 * Supports multiple tour providers (NW Touring, Herding Cats, etc.)
 */

interface Provider {
  id: string;
  name: string;
  tagline: string;
  color: string;
  minHours: number;
  baseRate: number;
  maxGuests: number;
}

const PROVIDERS: Provider[] = [
  {
    id: 'nw-touring',
    name: 'NW Touring & Concierge',
    tagline: 'Premium wine country transportation',
    color: '#B87333',
    minHours: 4,
    baseRate: 125,
    maxGuests: 14,
  },
  {
    id: 'herding-cats',
    name: 'Herding Cats Wine Tours',
    tagline: 'Unforgettable wine adventures',
    color: '#6B4E71',
    minHours: 4,
    baseRate: 110,
    maxGuests: 10,
  },
];

export default function BookTourPage() {
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    guests: 2,
    hours: 4,
    tourType: 'wine_tour',
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setStep(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const selectedProviderData = PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E07A5F] rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <span className="font-medium text-slate-900">Book a Tour</span>
          </Link>
          <div className="text-sm text-slate-500">
            Step {step} of 3
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 py-3">
                <div className={`h-1 rounded-full ${s <= step ? 'bg-[#E07A5F]' : 'bg-slate-200'}`} />
                <div className={`text-xs mt-1 ${s <= step ? 'text-[#E07A5F]' : 'text-slate-400'}`}>
                  {s === 1 && 'Choose Provider'}
                  {s === 2 && 'Tour Details'}
                  {s === 3 && 'Your Info'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Step 1: Choose Provider */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Choose Your Experience
              </h1>
              <p className="text-slate-600">
                Select a tour provider to get started
              </p>
            </div>

            <div className="grid gap-4">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider.id)}
                  className="bg-white rounded-xl border-2 border-slate-200 p-6 text-left hover:border-slate-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700">
                        {provider.name}
                      </h3>
                      <p className="text-slate-500 text-sm mb-2">{provider.tagline}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded">
                          From ${provider.baseRate}/hr
                        </span>
                        <span className="bg-slate-100 px-2 py-1 rounded">
                          Up to {provider.maxGuests} guests
                        </span>
                        <span className="bg-slate-100 px-2 py-1 rounded">
                          {provider.minHours}hr minimum
                        </span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Tour Details */}
        {step === 2 && selectedProviderData && (
          <div>
            <button 
              onClick={() => setStep(1)}
              className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Change provider
            </button>

            <div className="text-center mb-8">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold mx-auto mb-3"
                style={{ backgroundColor: selectedProviderData.color }}
              >
                {selectedProviderData.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">
                {selectedProviderData.name}
              </h1>
              <p className="text-slate-600">
                Tell us about your tour
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              {/* Tour Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What type of experience?
                </label>
                <select
                  name="tourType"
                  value={formData.tourType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': selectedProviderData.color } as React.CSSProperties}
                >
                  <option value="wine_tour">Wine Tour</option>
                  <option value="custom_charter">Custom Charter</option>
                  <option value="airport_transfer">Airport Transfer</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  When?
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
                />
              </div>

              {/* Guests & Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    How many guests?
                  </label>
                  <select
                    name="guests"
                    value={formData.guests}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
                  >
                    {Array.from({ length: selectedProviderData.maxGuests }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    How long?
                  </label>
                  <select
                    name="hours"
                    value={formData.hours}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2"
                  >
                    {Array.from({ length: 9 }, (_, i) => i + selectedProviderData.minHours).map(n => (
                      <option key={n} value={n}>{n} hours</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimated Price */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Estimated Total</span>
                  <span className="text-2xl font-semibold text-slate-900">
                    ${selectedProviderData.baseRate * formData.hours}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Final pricing may vary based on specific requirements
                </p>
              </div>

              <button
                onClick={() => setStep(3)}
                disabled={!formData.date}
                className="w-full py-3 rounded-lg text-white font-semibold transition-colors disabled:bg-slate-300"
                style={{ backgroundColor: formData.date ? selectedProviderData.color : undefined }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && selectedProviderData && (
          <div>
            <button 
              onClick={() => setStep(2)}
              className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to tour details
            </button>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Almost There!
              </h1>
              <p className="text-slate-600">
                Enter your contact information
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F]"
                  placeholder="(509) 555-0123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Special Requests or Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E07A5F] resize-none"
                  placeholder="Any wineries you'd like to visit, dietary restrictions, celebrations..."
                />
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-slate-900">Booking Summary</h3>
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Provider</span>
                    <span className="font-medium text-slate-900">{selectedProviderData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-medium text-slate-900">{formData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration</span>
                    <span className="font-medium text-slate-900">{formData.hours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests</span>
                    <span className="font-medium text-slate-900">{formData.guests}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="font-medium">Estimated Total</span>
                    <span className="font-semibold text-slate-900">${selectedProviderData.baseRate * formData.hours}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!formData.name || !formData.email}
                className="w-full py-3 rounded-lg text-white font-semibold transition-colors disabled:bg-slate-300 bg-[#E07A5F] hover:bg-[#d06a4f]"
              >
                Request Booking
              </button>

              <p className="text-xs text-slate-500 text-center">
                By submitting, you agree to our terms of service. 
                We'll confirm availability and send you a quote.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
