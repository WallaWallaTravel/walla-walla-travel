'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Embeddable Booking Widget
 * 
 * Designed to be embedded in Webflow via iframe:
 * <iframe src="https://wallawalla.travel/embed/booking" />
 * 
 * URL Parameters:
 * - provider: Pre-select a provider (nw-touring, herding-cats)
 * - minimal: Hide header (true/false)
 * - primaryColor: Override primary color
 */

interface Provider {
  id: string;
  name: string;
  shortName: string;
  color: string;
  minHours: number;
  baseRate: number;
  maxGuests: number;
}

const PROVIDERS: Provider[] = [
  {
    id: 'nw-touring',
    name: 'NW Touring & Concierge',
    shortName: 'NWT',
    color: '#B87333',
    minHours: 4,
    baseRate: 125,
    maxGuests: 14,
  },
  {
    id: 'herding-cats',
    name: 'Herding Cats Wine Tours',
    shortName: 'HC',
    color: '#6B4E71',
    minHours: 4,
    baseRate: 110,
    maxGuests: 10,
  },
];

function EmbedBookingContent() {
  const searchParams = useSearchParams();
  const preSelectedProvider = searchParams.get('provider');
  const isMinimal = searchParams.get('minimal') === 'true';
  const primaryColor = searchParams.get('primaryColor') || '#E07A5F';

  const [selectedProvider, setSelectedProvider] = useState<string | null>(preSelectedProvider);
  const [formData, setFormData] = useState({
    date: '',
    guests: 2,
    hours: 4,
    tourType: 'wine_tour',
    name: '',
    email: '',
    phone: '',
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Notify parent window of height changes for responsive iframe
    const sendHeight = () => {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'walla-embed-resize',
          height: document.body.scrollHeight
        }, '*');
      }
    };
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Embed widget communicates via postMessage - parent page handles actual booking
    setSubmitted(true);
    
    // Notify parent of successful submission
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'walla-booking-submitted',
        data: { provider: selectedProvider, ...formData }
      }, '*');
    }
  };

  const selectedProviderData = PROVIDERS.find(p => p.id === selectedProvider);

  if (submitted) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Request Received!</h2>
        <p className="text-slate-600 text-sm mb-4">
          We&apos;ll review your request and send you a confirmation email shortly.
        </p>
        <button
          onClick={() => { setSubmitted(false); setSelectedProvider(null); setFormData({
            date: '', guests: 2, hours: 4, tourType: 'wine_tour', name: '', email: '', phone: ''
          }); }}
          className="text-sm underline"
          style={{ color: primaryColor }}
        >
          Book another tour
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Header (can be hidden with ?minimal=true) */}
      {!isMinimal && (
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            W
          </div>
          <span className="font-medium text-slate-900 text-sm">Book a Wine Tour</span>
        </div>
      )}

      <div className="p-4">
        {/* Provider Selection */}
        {!selectedProvider && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 mb-3">Choose your tour provider:</p>
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className="w-full bg-slate-50 rounded-lg border border-slate-200 p-3 text-left hover:border-slate-300 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: provider.color }}
                  >
                    {provider.shortName}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 text-sm truncate">{provider.name}</div>
                    <div className="text-xs text-slate-500">From ${provider.baseRate}/hr</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Booking Form */}
        {selectedProvider && selectedProviderData && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider Badge */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: selectedProviderData.color }}
                >
                  {selectedProviderData.shortName}
                </div>
                <span className="text-sm font-medium text-slate-900">{selectedProviderData.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Change
              </button>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
            </div>

            {/* Guests & Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Guests</label>
                <select
                  name="guests"
                  value={formData.guests}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                >
                  {Array.from({ length: selectedProviderData.maxGuests }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Hours</label>
                <select
                  name="hours"
                  value={formData.hours}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                >
                  {[4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n} hrs</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Your Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone (optional)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                placeholder="(509) 555-0123"
              />
            </div>

            {/* Estimate */}
            <div className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-slate-600">Estimated total</span>
              <span className="text-lg font-semibold text-slate-900">
                ${selectedProviderData.baseRate * formData.hours}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Request Booking
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function EmbedBookingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <EmbedBookingContent />
    </Suspense>
  );
}
